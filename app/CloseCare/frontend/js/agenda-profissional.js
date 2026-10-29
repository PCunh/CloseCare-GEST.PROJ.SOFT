
const mensagemAcesso = document.getElementById("mensagem-acesso-agenda");
const conteudoAgenda = document.getElementById("conteudo-agenda");
const linkLoginAgenda = document.getElementById("link-login-agenda");
const formularioPerfil = document.getElementById("form-perfil-profissional");
const formularioHorario = document.getElementById("form-novo-horario");
const mensagemPerfil = document.getElementById("mensagem-perfil-profissional");
const mensagemHorario = document.getElementById("mensagem-novo-horario");
const mensagemLista = document.getElementById("mensagem-lista-agenda");
const listaAgenda = document.getElementById("lista-agenda");
const campoData = document.getElementById("agenda-data");
const campoInicio = document.getElementById("agenda-inicio");
const campoFim = document.getElementById("agenda-fim");

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "full"
});

const formatadorHora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
});

function mostrarMensagem(elemento, mensagem, tipo = "") {
    elemento.hidden = false;
    elemento.className = `resultado ${tipo}`.trim();
    elemento.textContent = mensagem;
}

function definirDataMinima() {
    const partes = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const valores = Object.fromEntries(
        partes.map(parte => [parte.type, parte.value])
    );

    campoData.min = `${valores.year}-${valores.month}-${valores.day}`;
    campoData.value = campoData.min;
}

function renderizarHorarios(horarios) {
    listaAgenda.replaceChildren();

    if (!horarios.length) {
        mensagemLista.textContent = "Você ainda não cadastrou horários.";
        return;
    }

    mensagemLista.textContent = `${horarios.length} horário(s) cadastrado(s).`;

    horarios.forEach(horario => {
        const item = document.createElement("article");
        item.className = "item-agenda";

        const titulo = document.createElement("h4");
        titulo.textContent = formatadorData.format(new Date(horario.inicio));

        const intervalo = document.createElement("p");
        intervalo.textContent = `${formatadorHora.format(new Date(horario.inicio))} às ${formatadorHora.format(new Date(horario.fim))}`;

        const identificador = document.createElement("small");
        identificador.textContent = `Horário #${horario.id}`;

        item.append(titulo, intervalo, identificador);
        listaAgenda.appendChild(item);
    });
}

async function carregarHorarios() {
    mensagemLista.textContent = "Carregando horários...";

    try {
        const horarios = await buscarMeusHorarios();
        renderizarHorarios(horarios);
    } catch (erro) {
        mensagemLista.textContent = `Não foi possível consultar a agenda: ${erro.message}`;
    }
}

async function iniciarAgenda() {
    try {
        const usuario = await obterUsuarioAtual();

        if (usuario.tipo_usuario !== "profissional") {
            mensagemAcesso.textContent = "Apenas profissionais podem gerenciar a agenda.";
            return;
        }

        const perfil = await buscarMeuPerfilProfissional();

        document.getElementById("agenda-profissional-nome").textContent = perfil.nome;
        document.getElementById("agenda-especialidade").value = perfil.especialidade;
        document.getElementById("agenda-raio").value = perfil.raio_atendimento_km;

        mensagemAcesso.hidden = true;
        conteudoAgenda.hidden = false;

        await carregarHorarios();
    } catch (erro) {
        mensagemAcesso.textContent = erro.status === 401
            ? "Entre na sua conta profissional para acessar a agenda."
            : `Não foi possível carregar seu perfil: ${erro.message}`;

        linkLoginAgenda.hidden = erro.status !== 401;
    }
}

formularioPerfil.addEventListener("submit", async evento => {
    evento.preventDefault();

    const botao = formularioPerfil.querySelector('button[type="submit"]');
    botao.disabled = true;

    try {
        const dados = {
            especialidade: document.getElementById("agenda-especialidade").value.trim(),
            raio_atendimento_km: Number(document.getElementById("agenda-raio").value)
        };

        const perfil = await atualizarMeuPerfilProfissional(dados);
        document.getElementById("agenda-especialidade").value = perfil.especialidade;
        document.getElementById("agenda-raio").value = perfil.raio_atendimento_km;
        mostrarMensagem(mensagemPerfil, "Perfil atualizado com sucesso.", "sucesso");
    } catch (erro) {
        mostrarMensagem(mensagemPerfil, erro.message, "erro");
    } finally {
        botao.disabled = false;
    }
});

formularioHorario.addEventListener("submit", async evento => {
    evento.preventDefault();

    if (campoFim.value <= campoInicio.value) {
        mostrarMensagem(mensagemHorario, "O horário de término deve ser posterior ao início.", "erro");
        return;
    }

    const dados = {
        inicio: `${campoData.value}T${campoInicio.value}:00-03:00`,
        fim: `${campoData.value}T${campoFim.value}:00-03:00`
    };

    if (new Date(dados.inicio).getTime() <= Date.now()) {
        mostrarMensagem(mensagemHorario, "Escolha um horário futuro.", "erro");
        return;
    }

    const botao = formularioHorario.querySelector('button[type="submit"]');
    botao.disabled = true;

    try {
        await cadastrarMeuHorario(dados);
        mostrarMensagem(mensagemHorario, "Horário cadastrado com sucesso.", "sucesso");
        campoInicio.value = "";
        campoFim.value = "";
        await carregarHorarios();
    } catch (erro) {
        mostrarMensagem(mensagemHorario, erro.message, "erro");
    } finally {
        botao.disabled = false;
    }
});

definirDataMinima();
iniciarAgenda();
