
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

const areaRemarcacao = document.getElementById("area-remarcacao");

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
    areaRemarcacao.hidden = !(
        agendamento.tipo === "consulta" &&
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
        await prepararRemarcacao();

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

    const campoDataRemarcacao = document.getElementById("data-remarcacao");
    const listaHorariosRemarcacao = document.getElementById("lista-horarios-remarcacao");
    const mensagemHorariosRemarcacao = document.getElementById("mensagem-horarios-remarcacao");
    const resumoRemarcacao = document.getElementById("resumo-remarcacao");
    const botaoConfirmarRemarcacao = document.getElementById("btn-confirmar-remarcacao");
    const mensagemRemarcacao = document.getElementById("mensagem-remarcacao");

    let horarioRemarcacaoSelecionado = null;
    let versaoBuscaRemarcacao = 0;
    let remarcacaoEmAndamento = false;

    function obterDataLocalRemarcacao(data) {
        const partes = new Intl.DateTimeFormat("en-US", {
            timeZone: FUSO_DETALHES,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date(data));

        const valores = Object.fromEntries(
            partes.map(parte => [parte.type, parte.value])
        );

        return `${valores.year}-${valores.month}-${valores.day}`;
    }

    function limparSelecaoRemarcacao() {
        horarioRemarcacaoSelecionado = null;
        resumoRemarcacao.hidden = true;
        resumoRemarcacao.textContent = "";
        botaoConfirmarRemarcacao.disabled = true;
    }

    async function carregarHorariosRemarcacao() {
        const versaoAtual = ++versaoBuscaRemarcacao;

        limparSelecaoRemarcacao();
        listaHorariosRemarcacao.replaceChildren();

        if (!agendamentoAtual || areaRemarcacao.hidden) {
            return;
        }

        const data = campoDataRemarcacao.value;

        if (!data || data < campoDataRemarcacao.min) {
            mensagemHorariosRemarcacao.textContent =
                "Escolha uma data válida.";
            return;
        }

        mensagemHorariosRemarcacao.textContent =
            "Buscando horários disponíveis...";

        try {
            const horarios = await buscarHorariosProfissional(
                agendamentoAtual.profissional_id,
                data
            );

            if (
                versaoAtual !== versaoBuscaRemarcacao ||
                areaRemarcacao.hidden
            ) {
                return;
            }

            const disponiveis = horarios.filter(horario =>
                horario.id !== agendamentoAtual.horario_id &&
                new Date(horario.inicio).getTime() > Date.now()
            );

            if (disponiveis.length === 0) {
                mensagemHorariosRemarcacao.textContent =
                    "Nenhum outro horário disponível nesta data.";
                return;
            }

            mensagemHorariosRemarcacao.textContent =
                `${disponiveis.length} horário(s) disponível(is).`;

            disponiveis.forEach(horario => {
                const botao = document.createElement("button");

                botao.type = "button";
                botao.className = "horario-opcao";
                botao.dataset.horarioId = String(horario.id);
                botao.setAttribute("aria-pressed", "false");

                botao.textContent =
                    `${formatarHoraDetalhes(horario.inicio)} às ` +
                    `${formatarHoraDetalhes(horario.fim)}`;

                botao.disabled = remarcacaoEmAndamento;

                botao.addEventListener("click", () => {
                    horarioRemarcacaoSelecionado = horario;

                    resumoRemarcacao.hidden = false;
                    resumoRemarcacao.textContent =
                        `Novo horário: ${formatarDataDetalhes(horario.inicio)} — ` +
                        `${formatarHoraDetalhes(horario.inicio)} às ` +
                        `${formatarHoraDetalhes(horario.fim)}`;

                    botaoConfirmarRemarcacao.disabled = false;

                    listaHorariosRemarcacao.querySelectorAll("button").forEach(opcao => {
                        opcao.setAttribute(
                            "aria-pressed",
                            String(opcao.dataset.horarioId === String(horario.id))
                        );
                    });
                });

                listaHorariosRemarcacao.appendChild(botao);
            });

        } catch (erro) {
            if (versaoAtual !== versaoBuscaRemarcacao) {
                return;
            }

            mensagemHorariosRemarcacao.textContent =
                `Não foi possível buscar horários: ${erro.message}`;
        }
    }

    async function prepararRemarcacao() {
        if (areaRemarcacao.hidden) {
            return;
        }

        const hoje = obterDataLocalRemarcacao(new Date());
        const dataAtual = obterDataLocalRemarcacao(agendamentoAtual.inicio);

        campoDataRemarcacao.min = hoje;
        campoDataRemarcacao.value =
            dataAtual >= hoje ? dataAtual : hoje;

        await carregarHorariosRemarcacao();
    }

    campoDataRemarcacao.addEventListener("change", () => {
        mensagemRemarcacao.hidden = true;
        carregarHorariosRemarcacao();
    });

    botaoConfirmarRemarcacao.addEventListener("click", async () => {
        if (
            remarcacaoEmAndamento ||
            !horarioRemarcacaoSelecionado ||
            !agendamentoAtual
        ) {
            return;
        }

        const novoHorario = horarioRemarcacaoSelecionado;

        const confirmado = window.confirm(
            `Remarcar a consulta para ${formatarDataDetalhes(novoHorario.inicio)} ` +
            `às ${formatarHoraDetalhes(novoHorario.inicio)}?`
        );

        if (!confirmado) {
            return;
        }

        remarcacaoEmAndamento = true;
        campoDataRemarcacao.disabled = true;
        botaoConfirmarRemarcacao.disabled = true;

        listaHorariosRemarcacao.querySelectorAll("button").forEach(botao => {
            botao.disabled = true;
        });

        mensagemRemarcacao.hidden = false;
        mensagemRemarcacao.className = "resultado";
        mensagemRemarcacao.textContent = "Remarcando consulta...";

        try {
            const resposta = await remarcarConsulta(
                agendamentoAtual.id,
                novoHorario.id
            );

            apresentarDetalhes({
                ...agendamentoAtual,
                horario_id: resposta.horario_id,
                inicio: resposta.inicio,
                fim: resposta.fim,
                status: resposta.status
            });

            await carregarHorariosRemarcacao();

            mensagemRemarcacao.className = "resultado sucesso";
            mensagemRemarcacao.textContent =
                `Consulta #${resposta.id} remarcada com sucesso.`;

        } catch (erro) {
            if (erro.status === 409) {
                try {
                    const atualizado = await buscarDetalhesAgendamento(
                        agendamentoAtual.id
                    );

                    apresentarDetalhes(atualizado);
                    await carregarHorariosRemarcacao();

                } catch (erroAtualizacao) {
                    console.error(erroAtualizacao);
                }
            }

            mensagemRemarcacao.className = "resultado erro";
            mensagemRemarcacao.textContent = erro.message;

        } finally {
            remarcacaoEmAndamento = false;
            campoDataRemarcacao.disabled = false;

            listaHorariosRemarcacao.querySelectorAll("button").forEach(botao => {
                botao.disabled = false;
            });

            botaoConfirmarRemarcacao.disabled =
                !horarioRemarcacaoSelecionado;
        }
    });

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
