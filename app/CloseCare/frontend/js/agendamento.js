
const parametros = new URLSearchParams(window.location.search);

const profissionalIdTexto = parametros.get("profissional_id");

const profissionalId = Number(profissionalIdTexto);

const estadoPagina = document.getElementById("estado-pagina");

const conteudoAgendamento = document.getElementById(
    "conteudo-agendamento"
);

const campoData = document.getElementById("data-agendamento");

const mensagemHorarios = document.getElementById(
    "mensagem-horarios"
);

const listaHorarios = document.getElementById("lista-horarios");

const resumoSelecao = document.getElementById("resumo-selecao");

const textoSelecao = document.getElementById("texto-selecao");

const FUSO_HORARIO = "America/Sao_Paulo";

const botaoConfirmar = document.getElementById(
    "btn-confirmar"
);

const mensagemConfirmacao = document.getElementById(
    "mensagem-confirmacao"
);

const avisoAgendamento = document.getElementById(
    "aviso-agendamento"
);

const orientacaoLogin = document.getElementById(
    "orientacao-login"
);

const linkMinhasConsultas = document.getElementById(
    "link-minhas-consultas"
);


let horariosAtuais = [];
let horarioSelecionado = null;
let versaoConsulta = 0;


function obterDataISO(data) {
    const formatador = new Intl.DateTimeFormat("en-US", {
        timeZone: FUSO_HORARIO,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });

    const partes = formatador.formatToParts(new Date(data));

    const ano = partes.find(
        parte => parte.type === "year"
    ).value;

    const mes = partes.find(
        parte => parte.type === "month"
    ).value;

    const dia = partes.find(
        parte => parte.type === "day"
    ).value;

    return `${ano}-${mes}-${dia}`;
}


function formatarData(data) {
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: FUSO_HORARIO,
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(new Date(data));
}


function formatarHora(data) {
    return new Intl.DateTimeFormat("pt-BR", {
        timeZone: FUSO_HORARIO,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).format(new Date(data));
}



function limparSelecao() {
    horarioSelecionado = null;

    resumoSelecao.hidden = true;

    botaoConfirmar.hidden = false;
    botaoConfirmar.disabled = true;

    mensagemConfirmacao.hidden = true;
    orientacaoLogin.hidden = true;
    linkMinhasConsultas.hidden = true;

    avisoAgendamento.textContent =
        "O horário ainda não foi reservado.";

    sessionStorage.removeItem(
        "closecare_agendamento_pendente"
    );
}



function selecionarHorario(horario) {
    horarioSelecionado = horario;

    sessionStorage.setItem(
        "closecare_agendamento_pendente",
        JSON.stringify({
            profissional_id: profissionalId,
            horario_id: horario.id,
            inicio: horario.inicio,
            fim: horario.fim
        })
    );

    textoSelecao.textContent =
        `${formatarData(horario.inicio)} — ` +
        `${formatarHora(horario.inicio)} às ` +
        `${formatarHora(horario.fim)}`;

    botaoConfirmar.disabled = false;
    botaoConfirmar.hidden = false;

    mensagemConfirmacao.hidden = true;
    orientacaoLogin.hidden = true;
    linkMinhasConsultas.hidden = true;

    avisoAgendamento.textContent =
        "Clique em Confirmar consulta para reservar.";

    resumoSelecao.hidden = false;

    renderizarHorarios(horariosAtuais);
}



function renderizarHorarios(horarios) {
    horariosAtuais = horarios;

    listaHorarios.replaceChildren();

    if (horarios.length === 0) {
        mensagemHorarios.textContent =
            "Nenhum horário disponível nesta data.";
        return;
    }

    mensagemHorarios.textContent =
        `${horarios.length} horário(s) disponível(is).`;

    const fragmento = document.createDocumentFragment();

    horarios.forEach(horario => {
        const botao = document.createElement("button");

        botao.type = "button";
        botao.className = "horario-opcao";

        botao.textContent =
            `${formatarHora(horario.inicio)} às ` +
            `${formatarHora(horario.fim)}`;

        botao.setAttribute(
            "aria-pressed",
            String(horarioSelecionado?.id === horario.id)
        );

        botao.addEventListener("click", () => {
            selecionarHorario(horario);
        });

        fragmento.appendChild(botao);
    });

    listaHorarios.appendChild(fragmento);
}


async function carregarHorariosPorData() {
    const data = campoData.value;

    const consultaAtual = ++versaoConsulta;

    limparSelecao();
    listaHorarios.replaceChildren();

    if (!data) {
        mensagemHorarios.textContent =
            "Selecione uma data.";
        return;
    }

    mensagemHorarios.textContent =
        "Consultando horários disponíveis...";

    try {
        const horarios = await buscarHorariosProfissional(
            profissionalId,
            data
        );

        if (consultaAtual !== versaoConsulta) {
            return;
        }

        renderizarHorarios(horarios);

    } catch (erro) {
        if (consultaAtual !== versaoConsulta) {
            return;
        }

        mensagemHorarios.textContent =
            "Não foi possível consultar os horários.";

        console.error("Erro ao consultar horários:", erro);
    }
}


async function inicializarAgendamento() {
    limparSelecao();

    if (
        !profissionalIdTexto ||
        !/^[1-9]\d*$/.test(profissionalIdTexto) ||
        !Number.isSafeInteger(profissionalId)
    ) {
        estadoPagina.textContent =
            "Profissional inválido. Volte à página de pesquisa.";
        return;
    }

    try {
        const [profissionais, horarios] = await Promise.all([
            buscarProfissionais(),
            buscarHorariosProfissional(profissionalId)
        ]);

        const profissional = profissionais.find(
            item => item.id === profissionalId
        );

        if (!profissional) {
            estadoPagina.textContent =
                "Profissional não encontrado.";
            return;
        }

        document.getElementById(
            "nome-profissional"
        ).textContent = profissional.nome;

        document.getElementById(
            "especialidade-profissional"
        ).textContent =
            `Especialidade: ${profissional.especialidade}`;

        document.getElementById(
            "raio-profissional"
        ).textContent =
            `Raio de atendimento: ` +
            `${profissional.raio_atendimento_km} km`;

        campoData.min = obterDataISO(new Date());

        if (horarios.length > 0) {
            campoData.value = obterDataISO(
                horarios[0].inicio
            );
        } else {
            campoData.value = campoData.min;
        }

        const horariosDaData = horarios.filter(
            horario =>
                obterDataISO(horario.inicio) === campoData.value
        );

        renderizarHorarios(horariosDaData);

        estadoPagina.hidden = true;
        conteudoAgendamento.hidden = false;

    } catch (erro) {
        estadoPagina.textContent =
            "Não foi possível carregar a agenda do profissional.";

        console.error("Erro ao carregar agenda:", erro);
    }
}


campoData.addEventListener(
    "change",
    carregarHorariosPorData
);



botaoConfirmar.addEventListener("click", async () => {
    if (!horarioSelecionado) {
        return;
    }

    const horarioId = horarioSelecionado.id;

    botaoConfirmar.disabled = true;
    campoData.disabled = true;

    listaHorarios.querySelectorAll("button").forEach(botao => {
        botao.disabled = true;
    });

    mensagemConfirmacao.hidden = false;
    mensagemConfirmacao.className = "resultado";
    mensagemConfirmacao.textContent =
        "Verificando disponibilidade...";

    orientacaoLogin.hidden = true;

    try {
        const resposta = await confirmarConsulta(horarioId);

        mensagemConfirmacao.textContent =
            `Consulta confirmada! Protocolo: ${resposta.id}.`;

        mensagemConfirmacao.className = "resultado sucesso";

        avisoAgendamento.textContent =
            "Sua consulta foi registrada no Close Care.";

        sessionStorage.removeItem(
            "closecare_agendamento_pendente"
        );

        horarioSelecionado = null;

        horariosAtuais = horariosAtuais.filter(
            horario => horario.id !== horarioId
        );

        renderizarHorarios(horariosAtuais);

        botaoConfirmar.hidden = true;
        linkMinhasConsultas.hidden = false;

    } catch (erro) {
        mensagemConfirmacao.className = "resultado erro";
        mensagemConfirmacao.textContent = erro.message;

        if (erro.status === 401) {
            mensagemConfirmacao.textContent =
                "Faça login como paciente para confirmar.";

            orientacaoLogin.hidden = false;

        } else if (erro.status === 403) {
            mensagemConfirmacao.textContent =
                "Esta conta não tem permissão para agendar.";

        } else if (erro.status === 409) {
            await carregarHorariosPorData();

            mensagemHorarios.textContent =
                "O horário escolhido não está mais disponível. Selecione outro.";
        }

    } finally {
        campoData.disabled = false;

        listaHorarios.querySelectorAll("button").forEach(botao => {
            botao.disabled = false;
        });

        botaoConfirmar.disabled =
            horarioSelecionado === null;
    }
});



inicializarAgendamento();


