
console.log("Close Care iniciado!");

const botaoConexao = document.getElementById("btn-conexao");
const botaoInformacoes = document.getElementById("btn-informacoes");
const resultadoConexao = document.getElementById("resultado-conexao");
const informacoesSistema = document.getElementById("informacoes-sistema");


botaoConexao.addEventListener("click", async () => {

    resultadoConexao.textContent = "Verificando conexão...";
    resultadoConexao.className = "resultado";

    botaoConexao.disabled = true;

    try {
        const dados = await verificarConexaoAPI();

        resultadoConexao.textContent = dados.mensagem;
        resultadoConexao.className = "resultado sucesso";

        console.log("Resposta do backend:", dados);

    } catch (erro) {

        resultadoConexao.textContent =
            "Erro: não foi possível conectar ao backend.";

        resultadoConexao.className = "resultado erro";

        console.error("Falha na conexão:", erro);

    } finally {

        botaoConexao.disabled = false;

    }
});

botaoInformacoes.addEventListener("click", async () => {

    informacoesSistema.textContent =
        "Carregando informações...";

    botaoInformacoes.disabled = true;

    try {
        const dados = await buscarInformacoesAPI();

        informacoesSistema.replaceChildren();

        const titulo = document.createElement("h3");
        titulo.textContent = dados.nome;

        const versao = document.createElement("p");
        versao.textContent = `Versão: ${dados.versao}`;

        const descricao = document.createElement("p");
        descricao.textContent = dados.descricao;

        const subtitulo = document.createElement("h4");
        subtitulo.textContent = "Serviços disponíveis:";

        const lista = document.createElement("ul");

        dados.servicos.forEach(servico => {
            const item = document.createElement("li");
            item.textContent = servico;
            lista.appendChild(item);
        });

        informacoesSistema.append(
            titulo,
            versao,
            descricao,
            subtitulo,
            lista
        );

        console.log("Informações carregadas:", dados);

    } catch (erro) {

        informacoesSistema.textContent =
            "Não foi possível carregar as informações.";

        console.error("Erro ao buscar informações:", erro);

    } finally {

        botaoInformacoes.disabled = false;

    }
});
