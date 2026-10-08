
import secrets

from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import engine
from models import Usuario, Profissional


profissionais_teste = [
    {
        "nome": "Joao Profissional 1",
        "email": "joao.enfermagem@example.com",
        "especialidade": "Enfermagem",
        "raio": 15
    },
    {
        "nome": "Maria Profissional 2",
        "email": "maria.fisioterapia@example.com",
        "especialidade": "Fisioterapia",
        "raio": 20
    },
    {
        "nome": "Gustavo Profissional 3",
        "email": "gustavo.psicologia@example.com",
        "especialidade": "Psicologia",
        "raio": 10
    },
    {
        "nome": "Heitor Profissional 4",
        "email": "heitor.nutricao@example.com",
        "especialidade": "Nutrição",
        "raio": 25
    },
    {
        "nome": "Lucas Profissional 5",
        "email": "lucas.enfermagem2@example.com",
        "especialidade": "Enfermagem",
        "raio": 30
    }
]


def cadastrar_profissionais():
    hash_senha = PasswordHash.recommended()
    adicionados = 0
    ignorados = 0

    with Session(engine) as db, db.begin():

        for dados in profissionais_teste:

            existente = db.scalar(
                select(Usuario.id).where(
                    Usuario.email == dados["email"]
                )
            )

            if existente is not None:
                ignorados += 1
                continue

            usuario = Usuario(
                nome=dados["nome"],
                email=dados["email"],
                senha_hash=hash_senha.hash(
                    secrets.token_urlsafe(24)
                ),
                tipo_usuario="profissional"
            )

            db.add(usuario)
            db.flush()

            profissional = Profissional(
                usuario_id=usuario.id,
                especialidade=dados["especialidade"],
                raio_atendimento_km=dados["raio"]
            )

            db.add(profissional)
            adicionados += 1

    print(f"Profissionais adicionados: {adicionados}")
    print(f"Registros já existentes: {ignorados}")


if __name__ == "__main__":
    cadastrar_profissionais()
