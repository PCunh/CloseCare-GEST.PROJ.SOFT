
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db
from models import Usuario, Profissional
from schemas import ProfissionalResumo

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from models import Horario, Agendamento
from schemas import HorarioDisponivel, HorarioCriar, PerfilProfissionalAtualizar

from security import obter_usuario_atual

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


def verificar_origem_profissional(request: Request):
    origem = request.headers.get("origin")

    if origem is not None and origem not in {
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000"
    }:
        raise HTTPException(
            status_code=403,
            detail="Origem não autorizada."
        )


def obter_meu_perfil(
    db: Session,
    usuario: Usuario,
    bloquear=False
):
    if usuario.tipo_usuario != "profissional":
        raise HTTPException(
            status_code=403,
            detail="Apenas profissionais podem gerenciar a agenda."
        )

    consulta = select(Profissional).where(
        Profissional.usuario_id == usuario.id
    )

    if bloquear:
        consulta = consulta.with_for_update()

    profissional = db.scalar(consulta)

    if profissional is None:
        raise HTTPException(
            status_code=404,
            detail="Perfil profissional não encontrado."
        )

    return profissional


def resposta_perfil(
    profissional: Profissional,
    usuario: Usuario
):
    return {
        "id": profissional.id,
        "nome": usuario.nome,
        "especialidade": profissional.especialidade,
        "raio_atendimento_km": profissional.raio_atendimento_km
    }


@router.get(
    "/meu-perfil",
    response_model=ProfissionalResumo
)
def consultar_meu_perfil(
    db: Annotated[Session, Depends(get_db)],
    usuario: Annotated[
        Usuario,
        Depends(obter_usuario_atual)
    ]
):
    profissional = obter_meu_perfil(db, usuario)

    return resposta_perfil(profissional, usuario)


@router.patch(
    "/meu-perfil",
    response_model=ProfissionalResumo
)
def atualizar_meu_perfil(
    dados: PerfilProfissionalAtualizar,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    usuario: Annotated[
        Usuario,
        Depends(obter_usuario_atual)
    ]
):
    verificar_origem_profissional(request)

    profissional = obter_meu_perfil(
        db,
        usuario,
        bloquear=True
    )

    profissional.especialidade = dados.especialidade
    profissional.raio_atendimento_km = (
        dados.raio_atendimento_km
    )

    db.commit()

    return resposta_perfil(profissional, usuario)


@router.get(
    "/meus-horarios",
    response_model=list[HorarioDisponivel]
)
def listar_meus_horarios(
    db: Annotated[Session, Depends(get_db)],
    usuario: Annotated[
        Usuario,
        Depends(obter_usuario_atual)
    ]
):
    profissional = obter_meu_perfil(db, usuario)

    consulta = (
        select(Horario)
        .where(
            Horario.profissional_id == profissional.id
        )
        .order_by(Horario.inicio)
    )

    return db.scalars(consulta).all()


@router.post(
    "/meus-horarios",
    response_model=HorarioDisponivel,
    status_code=status.HTTP_201_CREATED
)
def cadastrar_horario(
    dados: HorarioCriar,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    usuario: Annotated[
        Usuario,
        Depends(obter_usuario_atual)
    ]
):
    verificar_origem_profissional(request)

    profissional = obter_meu_perfil(
        db,
        usuario,
        bloquear=True
    )

    if dados.inicio <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=422,
            detail="O horário deve começar no futuro."
        )

    sobreposicao = db.scalar(
        select(Horario.id).where(
            Horario.profissional_id == profissional.id,
            Horario.inicio < dados.fim,
            Horario.fim > dados.inicio
        ).limit(1)
    )

    if sobreposicao is not None:
        raise HTTPException(
            status_code=409,
            detail="Já existe um horário cadastrado nesse período."
        )

    horario = Horario(
        profissional_id=profissional.id,
        inicio=dados.inicio,
        fim=dados.fim
    )

    db.add(horario)

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Horário já cadastrado."
        )

    db.refresh(horario)

    return horario
