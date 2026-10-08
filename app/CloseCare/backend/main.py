from typing import Annotated

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, select, func
from sqlalchemy.orm import Session

from database import get_db
from models import Usuario, Profissional, Horario, Agendamento

from routers import usuarios, auth, profissionais, agendamentos
app = FastAPI(
    title="Close Care",
    description="Sistema de atendimento domiciliar Close Care",
    version="0.1.0"
)

origens_permitidas = [
    "http://localhost:5500",
    "http://127.0.0.1:5500"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origens_permitidas,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Accept"]
)

app.include_router(usuarios.router)
app.include_router(auth.router)
app.include_router(profissionais.router)
app.include_router(agendamentos.router)

@app.get("/")
def inicio():
    return {
        "mensagem": "Bem-vindo ao Close Care!",
        "status": "funcionando"
    }


@app.get("/health")
def verificar_conexao():
    return {
        "status": "ok",
        "mensagem": "Frontend conectado ao backend!"
    }

@app.get("/health/db")
def verificar_banco(
    db: Annotated[Session, Depends(get_db)]
):
    db.execute(text("SELECT 1"))

    return {
        "status": "ok",
        "mensagem": "PostgreSQL conectado com sucesso!"
    }

@app.get("/api/info")
def informacoes_aplicacao():
    return {
        "nome": "Close Care",
        "versao": "0.1.0",
        "descricao": "Sistema de atendimento domiciliar",
        "servicos": [
            "Consultas domiciliares",
            "Exames domiciliares",
            "Pesquisa de profissionais"
        ]
    }

@app.get("/db/resumo")
def resumo_banco(
    db: Annotated[Session, Depends(get_db)]
):
    total_usuarios = db.scalar(
        select(func.count()).select_from(Usuario)
    )

    total_profissionais = db.scalar(
        select(func.count()).select_from(Profissional)
    )

    total_horarios = db.scalar(
        select(func.count()).select_from(Horario)
    )

    total_agendamentos = db.scalar(
        select(func.count()).select_from(Agendamento)
    )

    return {
        "usuarios": total_usuarios,
        "profissionais": total_profissionais,
        "horarios": total_horarios,
        "agendamentos": total_agendamentos
    }