
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from database import get_db
from models import Usuario, Profissional
from schemas import ProfissionalResumo

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from models import Horario, Agendamento
from schemas import HorarioDisponivel

router = APIRouter(
    prefix="/profissionais",
    tags=["Profissionais"]
)


@router.get("/especialidades", response_model=list[str])
def listar_especialidades(
    db: Annotated[Session, Depends(get_db)]
):
    consulta = (
        select(Profissional.especialidade)
        .distinct()
        .order_by(Profissional.especialidade)
    )

    return list(db.scalars(consulta).all())


@router.get("", response_model=list[ProfissionalResumo])
def listar_profissionais(
    db: Annotated[Session, Depends(get_db)],
    especialidade: Annotated[
        str | None,
        Query(max_length=100)
    ] = None
):
    consulta = (
        select(Profissional, Usuario)
        .join(
            Usuario,
            Usuario.id == Profissional.usuario_id
        )
    )

    if especialidade and especialidade.strip():
        consulta = consulta.where(
            func.lower(Profissional.especialidade)
            == especialidade.strip().lower()
        )

    consulta = consulta.order_by(
        Usuario.nome,
        Profissional.id
    )

    resultados = db.execute(consulta).all()

    return [
        {
            "id": profissional.id,
            "nome": usuario.nome,
            "especialidade": profissional.especialidade,
            "raio_atendimento_km": profissional.raio_atendimento_km
        }
        for profissional, usuario in resultados
    ]


FUSO = ZoneInfo("America/Sao_Paulo")


@router.get(
    "/{profissional_id}/horarios",
    response_model=list[HorarioDisponivel]
)
def listar_horarios_disponiveis(
    profissional_id: int,
    db: Annotated[Session, Depends(get_db)],
    data: date | None = None
):
    profissional = db.get(Profissional, profissional_id)

    if profissional is None:
        raise HTTPException(
            status_code=404,
            detail="Profissional não encontrado."
        )

    agora = datetime.now(FUSO)

    reserva_ativa = (
        select(Agendamento.id)
        .where(
            Agendamento.horario_id == Horario.id,
            Agendamento.status.in_(
                ["agendado", "realizado"]
            )
        )
        .exists()
    )

    consulta = (
        select(Horario)
        .where(
            Horario.profissional_id == profissional_id,
            Horario.inicio >= agora,
            ~reserva_ativa
        )
    )

    if data is not None:
        inicio_dia = datetime.combine(
            data,
            time.min,
            tzinfo=FUSO
        )

        fim_dia = inicio_dia + timedelta(days=1)

        consulta = consulta.where(
            Horario.inicio >= inicio_dia,
            Horario.inicio < fim_dia
        )

    consulta = consulta.order_by(Horario.inicio)

    return db.scalars(consulta).all()
