
const API_BASE_URL = "http://127.0.0.1:8000";

async function fazerRequisicao(endpoint) {

    const resposta = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        }
    );

    if (!resposta.ok) {
        throw new Error(
            `Erro HTTP: ${resposta.status}`
        );
    }

    const dados = await resposta.json();

    return dados;
}


async function verificarConexaoAPI() {
    return await fazerRequisicao("/health");
}


async function buscarInformacoesAPI() {
    return await fazerRequisicao("/api/info");
}
