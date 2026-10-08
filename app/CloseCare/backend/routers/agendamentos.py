
from datetime import datetime, timezone
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status
)
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import Usuario, Paciente, Horario, Agendamento
from schemas import AgendamentoCriar, AgendamentoResposta
from security import obter_usuario_atual


router = APIRouter(
    prefix="/agendamentos",
    tags=["Agendamentos"]
)


ORIGENS_PERMITIDAS = {
    "http://localhost:5500",
    "http://localhost:8000"
}


def validar_origem(request: Request):
    origem = request.headers.get("origin")

    if origem not in ORIGENS_PERMITIDAS:
        raise HTTPException(
            status_code=403,
            detail="Origem não autorizada."
        )


def obter_paciente(db: Session, usuario: Usuario):
    if usuario.tipo_usuario != "paciente":
        raise HTTPException(
            status_code=403,
            detail="Apenas pacientes podem agendar consultas."
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

    return paciente


def montar_resposta(agendamento: Agendamento, horario: Horario):
    return {
        "id": agendamento.id,
        "horario_id": horario.id,
        "profissional_id": horario.profissional_id,
        "tipo": agendamento.tipo,
        "status": agendamento.status,
        "inicio": horario.inicio,
        "fim": horario.fim
    }


@router.post(
    "",
    response_model=AgendamentoResposta,
    status_code=status.HTTP_201_CREATED
)
def confirmar_agendamento(
    dados: AgendamentoCriar,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    usuario: Annotated[
        Usuario,
        Depends(obter_usuario_atual)
    ]
):
    validar_origem(request)

    paciente = obter_paciente(db, usuario)

    try:
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
            tipo="consulta",
            status="agendado"
        )

        db.add(agendamento)
        db.flush()

        resposta = montar_resposta(
            agendamento,
            horario
        )

        db.commit()

        return resposta

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Este horário não está mais disponível."
        )

    except HTTPException:
        db.rollback()
        raise


@router.get(
    "/meus",
    response_model=list[AgendamentoResposta]
)
def listar_meus_agendamentos(
    db: Annotated[Session, Depends(get_db)],
    usuario: Annotated[
        Usuario,
        Depends(obter_usuario_atual)
    ]
):
    paciente = obter_paciente(db, usuario)

    consulta = (
        select(Agendamento, Horario)
        .join(
            Horario,
            Horario.id == Agendamento.horario_id
        )
        .where(
            Agendamento.paciente_id == paciente.id
        )
        .order_by(Horario.inicio)
    )

    resultados = db.execute(consulta).all()

    return [
        montar_resposta(agendamento, horario)
        for agendamento, horario in resultados
    ]
