
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from datetime import datetime, timezone
from database import get_db

from models import (
    TipoExame,
    ProfissionalExame,
    Profissional,
    Usuario,
    Paciente,
    Horario,
    Agendamento,
    ExameAgendado
)
from schemas import ProfissionalResumo, ExameAgendamentoCriar, ExameAgendamentoResposta
from security import obter_usuario_atual

router = APIRouter(
    prefix="/exames",
    tags=["Exames"]
)


def verificar_origem_exame(request: Request):
    origem = request.headers.get("origin")

    if origem and origem not in {
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000"
    }:
        raise HTTPException(
            status_code=403,
            detail="Origem não autorizada."
        )


@router.get("/tipos")
def listar_tipos_exames(
    db: Annotated[Session, Depends(get_db)]
):
    consulta = (
        select(TipoExame)
        .order_by(TipoExame.nome)
    )

    exames = db.scalars(consulta).all()

    return [
        {
            "id": exame.id,
            "nome": exame.nome,
            "descricao": exame.descricao
        }
        for exame in exames
    ]


@router.get(
    "/tipos/{exame_id}/profissionais",
    response_model=list[ProfissionalResumo]
)
def listar_profissionais_exame(
    exame_id: int,
    db: Annotated[Session, Depends(get_db)]
):
    exame = db.get(TipoExame, exame_id)

    if exame is None:
        raise HTTPException(
            status_code=404,
            detail="Tipo de exame não encontrado."
        )

    consulta = (
        select(Profissional, Usuario)
        .join(
            ProfissionalExame,
            ProfissionalExame.profissional_id ==
            Profissional.id
        )
        .join(
            Usuario,
            Usuario.id == Profissional.usuario_id
        )
        .where(
            ProfissionalExame.exame_id == exame_id
        )
        .order_by(
            Usuario.nome,
            Profissional.id
        )
    )

    resultados = db.execute(consulta).all()

    return [
        {
            "id": profissional.id,
            "nome": usuario.nome,
            "especialidade": profissional.especialidade,
            "raio_atendimento_km":
                profissional.raio_atendimento_km
        }
        for profissional, usuario in resultados
    ]


@router.post(
    "/agendamentos",
    response_model=ExameAgendamentoResposta,
    status_code=status.HTTP_201_CREATED
)
def confirmar_agendamento_exame(
    dados: ExameAgendamentoCriar,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    usuario: Annotated[
        Usuario,
        Depends(obter_usuario_atual)
    ]
):
    verificar_origem_exame(request)

    if usuario.tipo_usuario != "paciente":
        raise HTTPException(
            status_code=403,
            detail="Apenas pacientes podem agendar exames."
        )

    paciente = db.scalar(
        select(Paciente).where(
            Paciente.usuario_id == usuario.id
        )
    )

    if paciente is None:
        raise HTTPException(
            status_code=403,
            detail="Perfil de paciente não encontrado."
        )

    try:
        exame = db.get(TipoExame, dados.exame_id)

        if exame is None:
            raise HTTPException(
                status_code=404,
                detail="Tipo de exame não encontrado."
            )

        horario = db.scalar(
            select(Horario)
            .where(Horario.id == dados.horario_id)
            .with_for_update()
        )

        if horario is None:
            raise HTTPException(
                status_code=404,
                detail="Horário não encontrado."
            )

        if horario.inicio <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=409,
                detail="Este horário já passou."
            )

        profissional_aceita_exame = db.scalar(
            select(ProfissionalExame.id).where(
                ProfissionalExame.profissional_id ==
                    horario.profissional_id,
                ProfissionalExame.exame_id == exame.id
            )
        )

        if profissional_aceita_exame is None:
            raise HTTPException(
                status_code=422,
                detail="O profissional não oferece esse exame."
            )

        reserva_existente = db.scalar(
            select(Agendamento.id)
            .where(
                Agendamento.horario_id == horario.id,
                Agendamento.status.in_(
                    ["agendado", "realizado"]
                )
            )
            .limit(1)
        )

        if reserva_existente is not None:
            raise HTTPException(
                status_code=409,
                detail="Este horário não está mais disponível."
            )

        agendamento = Agendamento(
            paciente_id=paciente.id,
            horario_id=horario.id,
            tipo="exame",
            status="agendado"
        )

        db.add(agendamento)
        db.flush()

        exame_agendado = ExameAgendado(
            agendamento_id=agendamento.id,
            exame_id=exame.id,
            observacoes=dados.observacoes
        )

        db.add(exame_agendado)
        db.flush()

        resultado = {
            "id": agendamento.id,
            "exame_agendado_id": exame_agendado.id,
            "exame_id": exame.id,
            "exame_nome": exame.nome,
            "horario_id": horario.id,
            "profissional_id": horario.profissional_id,
            "tipo": agendamento.tipo,
            "status": agendamento.status,
            "inicio": horario.inicio,
            "fim": horario.fim
        }

        db.commit()

        return resultado

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Não foi possível reservar este horário."
        )

    except Exception:
        db.rollback()
        raise
