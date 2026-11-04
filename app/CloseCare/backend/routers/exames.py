
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import (
    TipoExame,
    ProfissionalExame,
    Profissional,
    Usuario
)
from schemas import ProfissionalResumo


router = APIRouter(
    prefix="/exames",
    tags=["Exames"]
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
