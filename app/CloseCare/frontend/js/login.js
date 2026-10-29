
const formularioLogin = document.getElementById(
    "form-login"
);

const botaoLogin = document.getElementById(
    "btn-login"
);

const mensagemLogin = document.getElementById(
    "mensagem-login"
);

function mostrarMensagemLogin(texto, tipo) {

    mensagemLogin.hidden = false;
    mensagemLogin.textContent = texto;
    mensagemLogin.className = `resultado ${tipo}`;
}

formularioLogin.addEventListener(
    "submit",
    async (evento) => {

        evento.preventDefault();

        const email = document.getElementById(
            "email"
        ).value.trim().toLowerCase();

        const senha = document.getElementById(
            "senha"
        ).value;

        botaoLogin.disabled = true;

        mostrarMensagemLogin(
            "Verificando credenciais...",
            ""
        );

        try {

            const resposta = await loginUsuario(
                email,
                senha
            );

            mostrarMensagemLogin(
                resposta.mensagem,
                "sucesso"
            );

            formularioLogin.reset();

            window.location.href = "painel.html";

        } catch (erro) {

            mostrarMensagemLogin(
                erro.message,
                "erro"
            );

        } finally {

            botaoLogin.disabled = false;

        }
    }
);
