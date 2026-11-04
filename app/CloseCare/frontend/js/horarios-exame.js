
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

const FUSO_EXAME = "America/Sao_Paulo";
const CHAVE_EXAME = "closecare_exame_pendente";

let selecaoExame = null;
let horarioSelecionadoExame = null;
let versaoConsultaExame = 0;


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

    if (selecaoExame) {
        sessionStorage.setItem(
            CHAVE_EXAME,
            JSON.stringify(selecaoExame)
        );
    }
}


function selecionarHorarioExame(horario) {
    horarioSelecionadoExame = horario;

    const dados = {
        ...selecaoExame,
        horario_id: horario.id,
        inicio: horario.inicio,
        fim: horario.fim
    };

    sessionStorage.setItem(
        CHAVE_EXAME,
        JSON.stringify(dados)
    );

    textoHorarioExame.textContent =
        `${formatarDataExame(horario.inicio)} — ` +
        `${formatarHoraExame(horario.inicio)} às ` +
        `${formatarHoraExame(horario.fim)}`;

    resumoHorarioExame.hidden = false;
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

        botao.textContent =
            `${formatarHoraExame(horario.inicio)} às ` +
            `${formatarHoraExame(horario.fim)}`;

        botao.setAttribute("aria-pressed", "false");

        botao.addEventListener("click", () => {
            selecionarHorarioExame(horario);

            listaHorariosExame.querySelectorAll(
                "button"
            ).forEach(item => {
                item.setAttribute(
                    "aria-pressed",
                    String(item === botao)
                );
            });
        });

        listaHorariosExame.appendChild(botao);
    });
}


async function carregarHorariosExame() {
    const versaoAtual = ++versaoConsultaExame;

    limparHorarioSelecionadoExame();
    listaHorariosExame.replaceChildren();

    const data = campoDataExame.value;
    const hoje = obterDataAtualExame();

    if (!data || data < hoje) {
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


iniciarHorariosExame();
