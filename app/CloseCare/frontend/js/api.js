
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

        } else if (resposta.status === 401) {

            mensagem = "Usuário não autenticado.";

        }

        throw new Error(mensagem);
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
