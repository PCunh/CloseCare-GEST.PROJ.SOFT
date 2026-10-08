
const parametrosDetalhes = new URLSearchParams(
    window.location.search
);

const agendamentoIdTexto = parametrosDetalhes.get("id");

const mensagemDetalhes = document.getElementById(
    "mensagem-detalhes"
);

const conteudoDetalhes = document.getElementById(
    "conteudo-detalhes"
);

const linkLoginDetalhes = document.getElementById(
    "link-login-detalhes"
);

const areaCancelamento = document.getElementById(
    "area-cancelamento"
);

const botaoCancelar = document.getElementById(
    "btn-cancelar-consulta"
);

const mensagemCancelamento = document.getElementById(
    "mensagem-cancelamento"
);

const FUSO_DETALHES = "America/Sao_Paulo";

let agendamentoAtual = null;


function formatarDataDetalhes(data) {
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: FUSO_DETALHES,
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(new Date(data));
}


function formatarHoraDetalhes(data) {
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: FUSO_DETALHES,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).format(new Date(data));
}


function formatarDataHoraDetalhes(data) {
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: FUSO_DETALHES,
        dateStyle: "short",
        timeStyle: "short"
    }).format(new Date(data));
}


function mostrarMensagemCancelamento(texto, tipo) {
    mensagemCancelamento.hidden = false;
    mensagemCancelamento.className = `resultado ${tipo}`;
    mensagemCancelamento.textContent = texto;
}


function apresentarDetalhes(agendamento) {
    agendamentoAtual = agendamento;

    const statusTexto = {
        agendado: "Agendado",
        cancelado: "Cancelado",
        realizado: "Realizado"
    };

    const tipoTexto = {
        consulta: "Consulta",
        exame: "Exame"
    };

    document.getElementById(
        "detalhe-protocolo"
    ).textContent = `#${agendamento.id}`;

    document.getElementById(
        "detalhe-profissional"
    ).textContent = agendamento.profissional_nome;

    document.getElementById(
        "detalhe-especialidade"
    ).textContent = agendamento.especialidade;

    document.getElementById(
        "detalhe-data"
    ).textContent = formatarDataDetalhes(
        agendamento.inicio
    );

    document.getElementById(
        "detalhe-horario"
    ).textContent =
        `${formatarHoraDetalhes(agendamento.inicio)} às ` +
        `${formatarHoraDetalhes(agendamento.fim)}`;

    document.getElementById(
        "detalhe-tipo"
    ).textContent =
        tipoTexto[agendamento.tipo] || agendamento.tipo;

    document.getElementById(
        "detalhe-criacao"
    ).textContent = formatarDataHoraDetalhes(
        agendamento.criado_em
    );

    const status = document.getElementById(
        "detalhe-status"
    );

    status.textContent =
        statusTexto[agendamento.status] ||
        agendamento.status;

    status.className = "status-consulta";

    if (
        ["agendado", "cancelado", "realizado"].includes(
            agendamento.status
        )
    ) {
        status.classList.add(
            `status-${agendamento.status}`
        );
    }

    const consultaFutura =
        new Date(agendamento.inicio).getTime() > Date.now();

    areaCancelamento.hidden = !(
        agendamento.status === "agendado" &&
        consultaFutura
    );

    mensagemDetalhes.hidden = true;
    conteudoDetalhes.hidden = false;
}


async function carregarDetalhes() {
    if (
        !agendamentoIdTexto ||
        !/^[1-9]\d*$/.test(agendamentoIdTexto) ||
        !Number.isSafeInteger(Number(agendamentoIdTexto))
    ) {
        mensagemDetalhes.textContent =
            "Identificador de agendamento inválido.";
        return;
    }

    try {
        const agendamento = await buscarDetalhesAgendamento(
            Number(agendamentoIdTexto)
        );

        apresentarDetalhes(agendamento);

    } catch (erro) {
        if (erro.status === 401) {
            mensagemDetalhes.textContent =
                "Você precisa fazer login para consultar sua reserva.";

            linkLoginDetalhes.hidden = false;

        } else if (erro.status === 403) {
            mensagemDetalhes.textContent =
                "Sua conta não tem permissão para consultar esta reserva.";

        } else if (erro.status === 404) {
            mensagemDetalhes.textContent =
                "Agendamento não encontrado.";

        } else {
            mensagemDetalhes.textContent =
                "Não foi possível carregar os detalhes do agendamento.";
        }

        console.error("Erro ao consultar agendamento:", erro);
    }
}


botaoCancelar.addEventListener("click", async () => {
    if (!agendamentoAtual) {
        return;
    }

    if (agendamentoAtual.status !== "agendado") {
        return;
    }

    const confirmado = window.confirm(
        "Deseja realmente cancelar esta consulta?"
    );

    if (!confirmado) {
        return;
    }

    botaoCancelar.disabled = true;

    mostrarMensagemCancelamento(
        "Cancelando consulta...",
        ""
    );

    try {
        const resposta = await cancelarAgendamento(
            agendamentoAtual.id
        );

        agendamentoAtual.status = resposta.status;

        apresentarDetalhes(agendamentoAtual);

        mostrarMensagemCancelamento(
            "Consulta cancelada com sucesso. O horário foi liberado.",
            "sucesso"
        );

    } catch (erro) {
        mostrarMensagemCancelamento(
            erro.message,
            "erro"
        );

        if (erro.status === 409) {
            try {
                const atualizado = await buscarDetalhesAgendamento(
                    agendamentoAtual.id
                );

                apresentarDetalhes(atualizado);

            } catch (erroAtualizacao) {
                console.error(
                    "Erro ao atualizar detalhes:",
                    erroAtualizacao
                );
            }
        }

        if (erro.status === 401) {
            linkLoginDetalhes.hidden = false;
        }

        console.error("Erro ao cancelar:", erro);

    } finally {
        botaoCancelar.disabled = false;
    }
});

carregarDetalhes();
