
const API_BASE_URL = "http://localhost:8000";

async function fazerRequisicao(
    endpoint,
    metodo = "GET",
    dados = null
) {

    const configuracao = {
        method: metodo,

        credentials: "include",

        headers: {
            "Accept": "application/json"
        }
    };

    if (dados !== null) {

        configuracao.headers["Content-Type"] =
            "application/json";

        configuracao.body = JSON.stringify(dados);
    }

    const resposta = await fetch(
        `${API_BASE_URL}${endpoint}`,
        configuracao
    );

    let conteudo = {};

    try {
        conteudo = await resposta.json();
    } catch {}

        if (!resposta.ok) {
            let mensagem = "Erro na requisição.";

            if (typeof conteudo.detail === "string") {
                mensagem = conteudo.detail;
            } else if (Array.isArray(conteudo.detail)) {
                mensagem = conteudo.detail
                    .map(erro => erro.msg)
                    .join("; ");
            }

            const erro = new Error(mensagem);
            erro.status = resposta.status;

            throw erro;
        }

        return conteudo;
}


async function verificarConexaoAPI() {
    return fazerRequisicao("/health");
}

async function buscarInformacoesAPI() {
    return fazerRequisicao("/api/info");
}

async function cadastrarUsuario(dados) {
    return fazerRequisicao("/usuarios", "POST", dados);
}

async function loginUsuario(email, senha) {

    return fazerRequisicao(
        "/auth/login",
        "POST",
        {
            email: email,
            senha: senha
        }
    );
}

async function obterUsuarioAtual() {
    return fazerRequisicao("/auth/me");
}

async function logoutUsuario() {
    return fazerRequisicao("/auth/logout", "POST");
}

async function buscarEspecialidades() {
    return fazerRequisicao("/profissionais/especialidades");
}


async function buscarProfissionais(especialidade = "") {
    let endpoint = "/profissionais";

    if (especialidade) {
        endpoint += `?especialidade=${encodeURIComponent(especialidade)}`;
    }

    return fazerRequisicao(endpoint);
}


async function buscarHorariosProfissional(
    profissionalId,
    data = ""
) {
    let endpoint =
        `/profissionais/${encodeURIComponent(profissionalId)}/horarios`;

    if (data) {
        endpoint += `?data=${encodeURIComponent(data)}`;
    }

    return fazerRequisicao(endpoint);
}

async function confirmarConsulta(horarioId) {
    return fazerRequisicao(
        "/agendamentos",
        "POST",
        {
            horario_id: horarioId
        }
    );
}


async function buscarMeusAgendamentos() {
    return fazerRequisicao("/agendamentos/meus");
}
