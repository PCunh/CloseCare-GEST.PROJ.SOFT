from fastapi import FastAPI

app = FastAPI(
    title="Close Care API",
    description="API do sistema Close Care",
    version="0.1.0"
)

@app.get("/")
def inicio():
    return {
        "mensagem": "Bem-vindo ao Close Care!",
        "status": "funcionando"
    }

@app.get("/health")
def verificar_status():
    return {
        "status": "ok"
    }
