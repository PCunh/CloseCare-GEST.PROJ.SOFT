from uuid import uuid4

from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import engine
from models import Usuario, Paciente

password_hash = PasswordHash.recommended()


def testar_persistencia():
    email_teste = f"teste_{uuid4().hex[:8]}@example.com"

    with Session(engine) as db:
        usuario = Usuario(
            nome="Paciente Teste",
            email=email_teste,
            senha_hash=password_hash.hash("SenhaFicticia123!"),
            tipo_usuario="paciente"
        )

        db.add(usuario)
        db.flush()

        paciente = Paciente(
            usuario_id=usuario.id,
            telefone="00000000000",
            endereco="Endereço fictício para teste"
        )

        db.add(paciente)
        db.commit()

        usuario_id = usuario.id
        print("Usuário gravado com ID:", usuario_id)

    with Session(engine) as db:
        usuario_salvo = db.scalar(
            select(Usuario).where(Usuario.id == usuario_id)
        )

        assert usuario_salvo is not None
        assert usuario_salvo.email == email_teste

        print("Usuário encontrado:", usuario_salvo.nome)
        print("E-mail:", usuario_salvo.email)
        print("Persistência confirmada!")


if __name__ == "__main__":
    testar_persistencia()
