
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


async function carregarConsultasRecebidas() {
    const lista = document.getElementById(
        "lista-consultas-profissional"
    );

    const mensagem = document.getElementById(
        "mensagem-consultas-profissional"
    );

    lista.replaceChildren();

    try {
        const consultas = await buscarConsultasRecebidas();

        if (consultas.length === 0) {
            mensagem.textContent =
                "Você ainda não possui consultas recebidas.";
            return;
        }

        mensagem.textContent =
            `${consultas.length} consulta(s) encontrada(s).`;

        const formatadorData = new Intl.DateTimeFormat(
            "pt-BR",
            {
                timeZone: "America/Sao_Paulo",
                dateStyle: "short",
                timeStyle: "short"
            }
        );

        const formatadorHora = new Intl.DateTimeFormat(
            "pt-BR",
            {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23"
            }
        );

        const statusTexto = {
            agendado: "Agendado",
            cancelado: "Cancelado",
            realizado: "Realizado"
        };

        consultas.forEach(consulta => {
            const cartao = document.createElement("article");
            cartao.className = "cartao-consulta";

            const titulo = document.createElement("h4");
            titulo.textContent = consulta.paciente_nome;

            const protocolo = document.createElement("p");
            protocolo.textContent =
                `Consulta #${consulta.id}`;

            const data = document.createElement("p");
            data.textContent =
                `Data: ${formatadorData.format(
                    new Date(consulta.inicio)
                )}`;

            const horario = document.createElement("p");
            horario.textContent =
                `Horário: ${formatadorHora.format(
                    new Date(consulta.inicio)
                )} às ${formatadorHora.format(
                    new Date(consulta.fim)
                )}`;

            const status = document.createElement("span");
            status.className = "status-consulta";

            if (
                ["agendado", "cancelado", "realizado"].includes(
                    consulta.status
                )
            ) {
                status.classList.add(
                    `status-${consulta.status}`
                );
            }

            status.textContent =
                statusTexto[consulta.status] ||
                consulta.status;

            cartao.append(
                titulo,
                protocolo,
                data,
                horario,
                status
            );

            lista.appendChild(cartao);
        });

    } catch (erro) {
        mensagem.textContent =
            "Não foi possível carregar as consultas recebidas.";

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

            carregarConsultasRecebidas();

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
