
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

from models import (
    Usuario,
    Paciente,
    Profissional,
    Horario,
    Agendamento
)

from schemas import (
    AgendamentoCriar,
    AgendamentoResposta,
    AgendamentoDetalhe
)

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



def montar_detalhe(
    agendamento,
    horario,
    profissional,
    usuario_profissional
):
    return {
        "id": agendamento.id,
        "horario_id": horario.id,
        "profissional_id": profissional.id,
        "profissional_nome": usuario_profissional.nome,
        "especialidade": profissional.especialidade,
        "tipo": agendamento.tipo,
        "status": agendamento.status,
        "inicio": horario.inicio,
        "fim": horario.fim,
        "criado_em": agendamento.criado_em
    }


@router.get(
    "/meus",
    response_model=list[AgendamentoDetalhe]
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
        select(
            Agendamento,
            Horario,
            Profissional,
            Usuario
        )
        .join(
            Horario,
            Horario.id == Agendamento.horario_id
        )
        .join(
            Profissional,
            Profissional.id == Horario.profissional_id
        )
        .join(
            Usuario,
            Usuario.id == Profissional.usuario_id
        )
        .where(
            Agendamento.paciente_id == paciente.id
        )
        .order_by(
            Horario.inicio.desc(),
            Agendamento.id.desc()
        )
    )

    resultados = db.execute(consulta).all()

    return [
        montar_detalhe(
            agendamento,
            horario,
            profissional,
            usuario_profissional
        )
        for (
            agendamento,
            horario,
            profissional,
            usuario_profissional
        ) in resultados
    ]


@router.get(
    "/{agendamento_id}",
    response_model=AgendamentoDetalhe
)
def consultar_detalhes_agendamento(
    agendamento_id: int,
    db: Annotated[Session, Depends(get_db)],
    usuario: Annotated[
        Usuario,
        Depends(obter_usuario_atual)
    ]
):
    paciente = obter_paciente(db, usuario)

    consulta = (
        select(
            Agendamento,
            Horario,
            Profissional,
            Usuario
        )
        .join(
            Horario,
            Horario.id == Agendamento.horario_id
        )
        .join(
            Profissional,
            Profissional.id == Horario.profissional_id
        )
        .join(
            Usuario,
            Usuario.id == Profissional.usuario_id
        )
        .where(
            Agendamento.id == agendamento_id,
            Agendamento.paciente_id == paciente.id
        )
    )

    resultado = db.execute(consulta).first()

    if resultado is None:
        raise HTTPException(
            status_code=404,
            detail="Agendamento não encontrado."
        )

    return montar_detalhe(*resultado)


@router.patch(
    "/{agendamento_id}/cancelar",
    response_model=AgendamentoResposta
)
def cancelar_agendamento(
    agendamento_id: int,
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
        horario_id = db.scalar(
            select(Agendamento.horario_id)
            .where(
                Agendamento.id == agendamento_id,
                Agendamento.paciente_id == paciente.id
            )
        )

        if horario_id is None:
            raise HTTPException(
                status_code=404,
                detail="Agendamento não encontrado."
            )

        horario = db.scalar(
            select(Horario)
            .where(Horario.id == horario_id)
            .with_for_update()
        )

        if horario is None:
            raise HTTPException(
                status_code=404,
                detail="Horário não encontrado."
            )

        agendamento = db.scalar(
            select(Agendamento)
            .where(
                Agendamento.id == agendamento_id,
                Agendamento.paciente_id == paciente.id
            )
            .with_for_update()
        )

        if agendamento is None:
            raise HTTPException(
                status_code=404,
                detail="Agendamento não encontrado."
            )

        if agendamento.status == "cancelado":
            raise HTTPException(
                status_code=409,
                detail="Esta consulta já foi cancelada."
            )

        if agendamento.status == "realizado":
            raise HTTPException(
                status_code=409,
                detail="Consultas realizadas não podem ser canceladas."
            )

        if agendamento.status != "agendado":
            raise HTTPException(
                status_code=409,
                detail="Esta consulta não pode ser cancelada."
            )

        if horario.inicio <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=409,
                detail="Não é possível cancelar uma consulta que já começou."
            )

        agendamento.status = "cancelado"

        resposta = montar_resposta(
            agendamento,
            horario
        )

        db.commit()

        return resposta

    except HTTPException:
        db.rollback()
        raise
