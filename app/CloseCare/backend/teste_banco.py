
import secrets

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from threading import Barrier

import httpx
import pytest

from pwdlib import PasswordHash
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from database import engine
from models import (
    Usuario,
    Paciente,
    Profissional,
    Horario,
    Agendamento
)


API_URL = "http://localhost:8000"
ORIGEM = "http://localhost:5500"


def criar_cliente():
    return httpx.Client(
        base_url=API_URL,
        headers={"Origin": ORIGEM},
        timeout=15.0
    )


def autenticar(cliente, email, senha):
    resposta = cliente.post(
        "/auth/login",
        json={
            "email": email,
            "senha": senha
        }
    )

    assert resposta.status_code == 200, resposta.text


def contar_reservas_ativas(horario_id):
    with Session(engine) as db:
        consulta = (
            select(func.count(Agendamento.id))
            .where(
                Agendamento.horario_id == horario_id,
                Agendamento.status.in_(
                    ["agendado", "realizado"]
                )
            )
        )

        return db.scalar(consulta)


@pytest.fixture
def dados_teste():
    identificador = secrets.token_hex(8)
    senha = secrets.token_urlsafe(18)

    usuarios_ids = []
    emails = []

    hash_senha = PasswordHash.recommended()

    with Session(engine) as db, db.begin():
        profissional_id = db.scalar(
            select(Profissional.id)
            .order_by(Profissional.id)
            .limit(1)
        )

        if profissional_id is None:
            pytest.skip(
                "Cadastre um profissional antes dos testes."
            )

        for numero in (1, 2):
            email = (
                f"concorrencia.{identificador}."
                f"{numero}@example.com"
            )

            usuario = Usuario(
                nome=f"Paciente Teste {numero}",
                email=email,
                senha_hash=hash_senha.hash(senha),
                tipo_usuario="paciente"
            )

            db.add(usuario)
            db.flush()

            db.add(
                Paciente(usuario_id=usuario.id)
            )

            usuarios_ids.append(usuario.id)
            emails.append(email)

        inicio = (
            datetime.now(timezone.utc)
            + timedelta(
                days=14,
                seconds=secrets.randbelow(20000)
            )
        )

        fim = inicio + timedelta(hours=1)

        horario = Horario(
            profissional_id=profissional_id,
            inicio=inicio,
            fim=fim
        )

        db.add(horario)
        db.flush()

        horario_id = horario.id

    try:
        yield {
            "emails": emails,
            "senha": senha,
            "horario_id": horario_id,
            "profissional_id": profissional_id
        }

    finally:
        with Session(engine) as db, db.begin():
            db.execute(
                delete(Agendamento).where(
                    Agendamento.horario_id == horario_id
                )
            )

            db.execute(
                delete(Horario).where(
                    Horario.id == horario_id
                )
            )

            db.execute(
                delete(Paciente).where(
                    Paciente.usuario_id.in_(usuarios_ids)
                )
            )

            db.execute(
                delete(Usuario).where(
                    Usuario.id.in_(usuarios_ids)
                )
            )


def test_usuario_sem_login(dados_teste):
    with criar_cliente() as cliente:
        resposta = cliente.post(
            "/agendamentos",
            json={
                "horario_id": dados_teste["horario_id"]
            }
        )

    assert resposta.status_code == 401

    assert contar_reservas_ativas(
        dados_teste["horario_id"]
    ) == 0


def test_duas_reservas_simultaneas(dados_teste):
    horario_id = dados_teste["horario_id"]

    with criar_cliente() as cliente_a, criar_cliente() as cliente_b:
        autenticar(
            cliente_a,
            dados_teste["emails"][0],
            dados_teste["senha"]
        )

        autenticar(
            cliente_b,
            dados_teste["emails"][1],
            dados_teste["senha"]
        )

        barreira = Barrier(3)

        def reservar(cliente):
            barreira.wait(timeout=10)

            return cliente.post(
                "/agendamentos",
                json={"horario_id": horario_id}
            )

        with ThreadPoolExecutor(max_workers=2) as executor:
            futuro_a = executor.submit(reservar, cliente_a)
            futuro_b = executor.submit(reservar, cliente_b)

            barreira.wait(timeout=10)

            resposta_a = futuro_a.result(timeout=20)
            resposta_b = futuro_b.result(timeout=20)

        resultados = sorted([
            resposta_a.status_code,
            resposta_b.status_code
        ])

        assert resultados == [201, 409], [
            resposta_a.text,
            resposta_b.text
        ]

    assert contar_reservas_ativas(horario_id) == 1


def test_horario_cancelado_pode_ser_reservado(dados_teste):
    horario_id = dados_teste["horario_id"]

    with criar_cliente() as cliente_a, criar_cliente() as cliente_b:
        autenticar(
            cliente_a,
            dados_teste["emails"][0],
            dados_teste["senha"]
        )

        autenticar(
            cliente_b,
            dados_teste["emails"][1],
            dados_teste["senha"]
        )

        primeira = cliente_a.post(
            "/agendamentos",
            json={"horario_id": horario_id}
        )

        assert primeira.status_code == 201, primeira.text

        with Session(engine) as db, db.begin():
            agendamento = db.get(
                Agendamento,
                primeira.json()["id"]
            )

            agendamento.status = "cancelado"

        segunda = cliente_b.post(
            "/agendamentos",
            json={"horario_id": horario_id}
        )

        assert segunda.status_code == 201, segunda.text

    assert contar_reservas_ativas(horario_id) == 1


def test_horario_realizado_continua_ocupado(dados_teste):
    horario_id = dados_teste["horario_id"]

    with criar_cliente() as cliente_a, criar_cliente() as cliente_b:
        autenticar(
            cliente_a,
            dados_teste["emails"][0],
            dados_teste["senha"]
        )

        autenticar(
            cliente_b,
            dados_teste["emails"][1],
            dados_teste["senha"]
        )

        primeira = cliente_a.post(
            "/agendamentos",
            json={"horario_id": horario_id}
        )

        assert primeira.status_code == 201, primeira.text

        with Session(engine) as db, db.begin():
            agendamento = db.get(
                Agendamento,
                primeira.json()["id"]
            )

            agendamento.status = "realizado"

        segunda = cliente_b.post(
            "/agendamentos",
            json={"horario_id": horario_id}
        )

        assert segunda.status_code == 409, segunda.text

    assert contar_reservas_ativas(horario_id) == 1