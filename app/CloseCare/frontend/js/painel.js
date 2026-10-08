
const carregandoPerfil = document.getElementById(
    "carregando-perfil"
);

const conteudoPerfil = document.getElementById(
    "conteudo-perfil"
);

const botaoSair = document.getElementById(
    "btn-sair"
);

const mensagemPainel = document.getElementById(
    "mensagem-painel"
);


async function carregarMeusAgendamentos() {
    const lista = document.getElementById(
        "lista-consultas"
    );

    const mensagem = document.getElementById(
        "mensagem-consultas"
    );

    try {
        const agendamentos = await buscarMeusAgendamentos();

        lista.replaceChildren();

        if (agendamentos.length === 0) {
            mensagem.textContent =
                "Você ainda não possui consultas agendadas.";
            return;
        }

        mensagem.textContent =
            `${agendamentos.length} registro(s) encontrado(s).`;

        agendamentos.forEach(agendamento => {
            const item = document.createElement("li");

            const data = new Intl.DateTimeFormat("pt-BR", {
                timeZone: "America/Sao_Paulo",
                dateStyle: "short",
                timeStyle: "short"
            }).format(new Date(agendamento.inicio));

            item.textContent =
                `Consulta #${agendamento.id} — ` +
                `${data} — ${agendamento.status}`;

            lista.appendChild(item);
        });

    } catch (erro) {
        mensagem.textContent =
            "Não foi possível carregar suas consultas.";

        console.error(erro);
    }
}


async function carregarPerfil() {

    try {

        const usuario = await obterUsuarioAtual();

        document.getElementById(
            "boas-vindas"
        ).textContent = `Bem-vindo(a), ${usuario.nome}!`;

        document.getElementById(
            "perfil-nome"
        ).textContent = usuario.nome;

        document.getElementById(
            "perfil-email"
        ).textContent = usuario.email;

        document.getElementById(
            "perfil-tipo"
        ).textContent = usuario.tipo_usuario;

        if (usuario.tipo_usuario === "paciente") {
            carregarMeusAgendamentos();
            document.getElementById(
                "area-paciente"
            ).hidden = false;

        } else if (
            usuario.tipo_usuario === "profissional"
        ) {

            document.getElementById(
                "area-profissional"
            ).hidden = false;

        }

        carregandoPerfil.hidden = true;
        conteudoPerfil.hidden = false;

    } catch (erro) {

        carregandoPerfil.textContent =
            "Não foi possível validar sua sessão.";

        window.location.replace("login.html");

    }
}

botaoSair.addEventListener("click", async () => {

    botaoSair.disabled = true;

    try {

        await logoutUsuario();

        window.location.replace("login.html");

    } catch (erro) {

        mensagemPainel.hidden = false;

        mensagemPainel.textContent =
            "Não foi possível encerrar a sessão. Tente novamente.";

        mensagemPainel.className = "resultado erro";

        botaoSair.disabled = false;

    }
});

carregarPerfil();
