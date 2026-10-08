
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from database import get_db
from models import Usuario, Profissional
from schemas import ProfissionalResumo


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
