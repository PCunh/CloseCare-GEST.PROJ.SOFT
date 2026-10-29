
const carregandoPerfil = document.getElementById("carregando-perfil");

const conteudoPerfil = document.getElementById("conteudo-perfil");

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

    lista.replaceChildren();

    try {
        const agendamentos = await buscarMeusAgendamentos();

        if (agendamentos.length === 0) {
            mensagem.textContent =
                "Você ainda não possui consultas cadastradas.";
            return;
        }

        mensagem.textContent =
            `${agendamentos.length} consulta(s) encontrada(s).`;

        const formatador = new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Sao_Paulo",
            dateStyle: "short",
            timeStyle: "short"
        });

        const statusTexto = {
            agendado: "Agendado",
            cancelado: "Cancelado",
            realizado: "Realizado"
        };

        agendamentos.forEach(agendamento => {
            const cartao = document.createElement("article");
            cartao.className = "cartao-consulta";

            const titulo = document.createElement("h4");
            titulo.textContent =
                agendamento.profissional_nome;

            const especialidade = document.createElement("p");
            especialidade.textContent =
                agendamento.especialidade;

            const data = document.createElement("p");
            data.textContent =
                `Data: ${formatador.format(
                    new Date(agendamento.inicio)
                )}`;

            const status = document.createElement("span");
            status.className = "status-consulta";

            if (["agendado", "cancelado", "realizado"].includes(
                agendamento.status
            )) {
                status.classList.add(
                    `status-${agendamento.status}`
                );
            }

            status.textContent =
                statusTexto[agendamento.status] ||
                agendamento.status;

            const link = document.createElement("a");
            link.className = "link-detalhes";
            link.textContent = "Ver detalhes";

            link.href =
                `detalhes-agendamento.html?id=${agendamento.id}`;

            cartao.append(
                titulo,
                especialidade,
                data,
                status,
                link
            );

            lista.appendChild(cartao);
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
