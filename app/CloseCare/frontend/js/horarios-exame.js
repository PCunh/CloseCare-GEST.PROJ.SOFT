
const estadoHorariosExame = document.getElementById(
    "estado-horarios-exame"
);

const conteudoHorariosExame = document.getElementById(
    "conteudo-horarios-exame"
);

const campoDataExame = document.getElementById(
    "data-horarios-exame"
);

const mensagemHorariosExame = document.getElementById(
    "mensagem-horarios-exame"
);

const listaHorariosExame = document.getElementById(
    "lista-horarios-exame"
);

const resumoHorarioExame = document.getElementById(
    "resumo-horario-exame"
);

const textoHorarioExame = document.getElementById(
    "texto-horario-exame"
);

const botaoConfirmarExame = document.getElementById(
    "btn-confirmar-exame"
);

const mensagemConfirmacaoExame = document.getElementById(
    "mensagem-confirmacao-exame"
);

const linkLoginExame = document.getElementById(
    "link-login-exame"
);

const avisoConfirmacaoExame = document.getElementById(
    "aviso-confirmacao-exame"
);

const campoObservacoesExame = document.getElementById(
    "campo-observacoes-exame"
);

const observacoesExame = document.getElementById(
    "observacoes-exame"
);

const FUSO_EXAME = "America/Sao_Paulo";
const CHAVE_EXAME = "closecare_exame_pendente";

let selecaoExame = null;
let horarioSelecionadoExame = null;
let versaoConsultaExame = 0;
let confirmandoExame = false;
let exameConfirmado = false;


function obterDataAtualExame() {
    const partes = new Intl.DateTimeFormat("en-US", {
        timeZone: FUSO_EXAME,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const valores = Object.fromEntries(
        partes.map(parte => [parte.type, parte.value])
    );

    return `${valores.year}-${valores.month}-${valores.day}`;
}


function formatarDataExame(data) {
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: FUSO_EXAME,
        dateStyle: "short"
    }).format(new Date(data));
}


function formatarHoraExame(data) {
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: FUSO_EXAME,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).format(new Date(data));
}


function mostrarMensagemConfirmacaoExame(
    mensagem,
    tipo = ""
) {
    mensagemConfirmacaoExame.hidden = false;
    mensagemConfirmacaoExame.className =
        `resultado ${tipo}`.trim();

    mensagemConfirmacaoExame.textContent = mensagem;
}


function recuperarSelecaoExame() {
    try {
        const dados = JSON.parse(
            sessionStorage.getItem(CHAVE_EXAME)
        );

        if (!dados) {
            return null;
        }

        const exameId = Number(dados.exame_id);
        const profissionalId = Number(dados.profissional_id);

        if (
            !Number.isSafeInteger(exameId) ||
            exameId <= 0 ||
            !Number.isSafeInteger(profissionalId) ||
            profissionalId <= 0 ||
            typeof dados.exame_nome !== "string" ||
            !dados.exame_nome.trim() ||
            typeof dados.profissional_nome !== "string" ||
            !dados.profissional_nome.trim()
        ) {
            return null;
        }

        return {
            exame_id: exameId,
            exame_nome: dados.exame_nome,
            profissional_id: profissionalId,
            profissional_nome: dados.profissional_nome
        };

    } catch {
        return null;
    }
}


function limparHorarioSelecionadoExame() {
    horarioSelecionadoExame = null;

    resumoHorarioExame.hidden = true;
    textoHorarioExame.textContent = "";

    botaoConfirmarExame.hidden = false;
    botaoConfirmarExame.disabled = true;

    mensagemConfirmacaoExame.hidden = true;
    linkLoginExame.hidden = true;

    if (selecaoExame && !exameConfirmado) {
        sessionStorage.setItem(
            CHAVE_EXAME,
            JSON.stringify(selecaoExame)
        );
    }
}


function selecionarHorarioExame(horario) {
    if (confirmandoExame || exameConfirmado) {
        return;
    }

    if (
        new Date(horario.inicio).getTime() <= Date.now()
    ) {
        mensagemHorariosExame.textContent =
            "Este horário já passou. Escolha outro.";
        return;
    }

    horarioSelecionadoExame = horario;

    sessionStorage.setItem(
        CHAVE_EXAME,
        JSON.stringify({
            ...selecaoExame,
            horario_id: horario.id,
            inicio: horario.inicio,
            fim: horario.fim
        })
    );

    textoHorarioExame.textContent =
        `${formatarDataExame(horario.inicio)} — ` +
        `${formatarHoraExame(horario.inicio)} às ` +
        `${formatarHoraExame(horario.fim)}`;

    avisoConfirmacaoExame.textContent =
        "Clique em Confirmar exame para reservar o horário.";

    botaoConfirmarExame.hidden = false;
    botaoConfirmarExame.disabled = false;

    mensagemConfirmacaoExame.hidden = true;
    linkLoginExame.hidden = true;

    resumoHorarioExame.hidden = false;

    listaHorariosExame.querySelectorAll("button").forEach(
        botao => {
            botao.setAttribute(
                "aria-pressed",
                String(Number(botao.dataset.horarioId) === horario.id)
            );
        }
    );
}


function renderizarHorariosExame(horarios) {
    listaHorariosExame.replaceChildren();

    const horariosFuturos = horarios.filter(
        horario =>
            new Date(horario.inicio).getTime() > Date.now()
    );

    if (horariosFuturos.length === 0) {
        mensagemHorariosExame.textContent =
            "Nenhum horário disponível nesta data.";
        return;
    }

    mensagemHorariosExame.textContent =
        `${horariosFuturos.length} horário(s) disponível(is).`;

    horariosFuturos.forEach(horario => {
        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "botao-horario-exame";
        botao.dataset.horarioId = String(horario.id);

        botao.textContent =
            `${formatarHoraExame(horario.inicio)} às ` +
            `${formatarHoraExame(horario.fim)}`;

        botao.setAttribute("aria-pressed", "false");

        botao.addEventListener("click", () => {
            selecionarHorarioExame(horario);
        });

        listaHorariosExame.appendChild(botao);
    });
}


async function carregarHorariosExame() {
    if (confirmandoExame || exameConfirmado) {
        return;
    }

    const versaoAtual = ++versaoConsultaExame;

    limparHorarioSelecionadoExame();
    listaHorariosExame.replaceChildren();

    const data = campoDataExame.value;

    if (!data || data < obterDataAtualExame()) {
        mensagemHorariosExame.textContent =
            "Selecione uma data válida, a partir de hoje.";
        return;
    }

    mensagemHorariosExame.textContent =
        "Buscando horários disponíveis...";

    try {
        const horarios = await buscarHorariosProfissional(
            selecaoExame.profissional_id,
            data
        );

        if (versaoAtual !== versaoConsultaExame) {
            return;
        }

        if (!Array.isArray(horarios)) {
            throw new Error("Resposta de horários inválida.");
        }

        renderizarHorariosExame(horarios);

    } catch (erro) {
        if (versaoAtual !== versaoConsultaExame) {
            return;
        }

        mensagemHorariosExame.textContent =
            `Não foi possível carregar os horários: ${erro.message}`;

        console.error(erro);
    }
}


async function confirmarExameSelecionado() {
    if (
        !selecaoExame ||
        !horarioSelecionadoExame ||
        confirmandoExame ||
        exameConfirmado
    ) {
        return;
    }

    if (
        new Date(horarioSelecionadoExame.inicio).getTime()
        <= Date.now()
    ) {
        await carregarHorariosExame();

        mensagemHorariosExame.textContent =
            "O horário escolhido já passou. Selecione outro.";
        return;
    }

    confirmandoExame = true;
    botaoConfirmarExame.disabled = true;
    campoDataExame.disabled = true;
    observacoesExame.disabled = true;
    linkLoginExame.hidden = true;

    listaHorariosExame.querySelectorAll("button").forEach(
        botao => {
            botao.disabled = true;
        }
    );

    mostrarMensagemConfirmacaoExame(
        "Confirmando agendamento..."
    );

    const exameId = selecaoExame.exame_id;
    const horarioId = horarioSelecionadoExame.id;
    const observacoes = observacoesExame.value.trim();

    try {
        const resposta = await confirmarAgendamentoExame(
            exameId,
            horarioId,
            observacoes || null
        );

        exameConfirmado = true;

        sessionStorage.removeItem(CHAVE_EXAME);

        mostrarMensagemConfirmacaoExame(
            `Exame confirmado com sucesso! Protocolo: #${resposta.id}.`,
            "sucesso"
        );

        avisoConfirmacaoExame.textContent =
            "Seu exame foi registrado. Guarde o número do protocolo.";

        botaoConfirmarExame.hidden = true;
        campoObservacoesExame.hidden = true;
        linkLoginExame.hidden = true;

        listaHorariosExame.replaceChildren();

        mensagemHorariosExame.textContent =
            "Agendamento concluído. Para agendar outro exame, volte à página de exames.";

    } catch (erro) {
        if (erro.status === 401) {
            mostrarMensagemConfirmacaoExame(
                "Faça login como paciente para confirmar o exame.",
                "erro"
            );

            linkLoginExame.hidden = false;

        } else if (erro.status === 403) {
            mostrarMensagemConfirmacaoExame(
                "Sua conta não tem permissão para agendar exames.",
                "erro"
            );

        } else if (erro.status === 409) {
            confirmandoExame = false;

            await carregarHorariosExame();

            mensagemHorariosExame.textContent =
                "O horário não está mais disponível. Escolha outro.";

        } else {
            mostrarMensagemConfirmacaoExame(
                erro.message,
                "erro"
            );
        }

        console.error("Erro ao confirmar exame:", erro);

    } finally {
        confirmandoExame = false;

        if (!exameConfirmado) {
            campoDataExame.disabled = false;
            observacoesExame.disabled = false;

            botaoConfirmarExame.disabled =
                horarioSelecionadoExame === null;

            listaHorariosExame.querySelectorAll("button").forEach(
                botao => {
                    botao.disabled = false;
                }
            );
        }
    }
}


function iniciarHorariosExame() {
    selecaoExame = recuperarSelecaoExame();

    if (!selecaoExame) {
        estadoHorariosExame.textContent =
            "Selecione primeiro um exame e um profissional.";
        return;
    }

    document.getElementById(
        "nome-tipo-exame"
    ).textContent = selecaoExame.exame_nome;

    document.getElementById(
        "nome-profissional-exame"
    ).textContent = selecaoExame.profissional_nome;

    const hoje = obterDataAtualExame();

    campoDataExame.min = hoje;
    campoDataExame.value = hoje;

    estadoHorariosExame.hidden = true;
    conteudoHorariosExame.hidden = false;

    carregarHorariosExame();
}


campoDataExame.addEventListener(
    "change",
    carregarHorariosExame
);

botaoConfirmarExame.addEventListener(
    "click",
    confirmarExameSelecionado
);


iniciarHorariosExame();
