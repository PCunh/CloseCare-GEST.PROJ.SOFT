
const formularioExame = document.getElementById(
    "form-pesquisa-exame"
);

const campoTipoExame = document.getElementById(
    "tipo-exame"
);

const botaoPesquisarExame = document.getElementById(
    "btn-pesquisar-exame"
);

const mensagemTiposExame = document.getElementById(
    "mensagem-tipos-exame"
);

const mensagemProfissionaisExame = document.getElementById(
    "mensagem-profissionais-exame"
);

const listaProfissionaisExame = document.getElementById(
    "lista-profissionais-exame"
);

const resumoExame = document.getElementById(
    "resumo-exame"
);

const textoResumoExame = document.getElementById(
    "texto-resumo-exame"
);

let tiposExames = [];
let pesquisaAtual = 0;


function limparSelecaoExame() {
    sessionStorage.removeItem(
        "closecare_exame_pendente"
    );

    resumoExame.hidden = true;
}


function selecionarProfissionalExame(exame, profissional) {
    const selecao = {
        exame_id: exame.id,
        exame_nome: exame.nome,
        profissional_id: profissional.id,
        profissional_nome: profissional.nome
    };

    sessionStorage.setItem(
        "closecare_exame_pendente",
        JSON.stringify(selecao)
    );

    textoResumoExame.textContent =
        `Exame: ${exame.nome}. Profissional: ${profissional.nome}.`;

    resumoExame.hidden = false;
}


function criarCartaoExame(exame, profissional) {
    const cartao = document.createElement("article");
    cartao.className = "card-profissional";

    const nome = document.createElement("h3");
    nome.textContent = profissional.nome;

    const especialidade = document.createElement("p");
    especialidade.textContent =
        `Especialidade: ${profissional.especialidade}`;

    const raio = document.createElement("p");
    raio.textContent =
        `Raio de atendimento: ${profissional.raio_atendimento_km} km`;

    const botaoSelecionar = document.createElement("button");
    botaoSelecionar.type = "button";
    botaoSelecionar.className = "botao";
    botaoSelecionar.textContent = "Selecionar profissional";

    botaoSelecionar.addEventListener("click", () => {
        selecionarProfissionalExame(exame, profissional);

        listaProfissionaisExame.querySelectorAll(
            "button"
        ).forEach(botao => {
            botao.setAttribute(
                "aria-pressed",
                String(botao === botaoSelecionar)
            );
        });

        resumoExame.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    });

    cartao.append(
        nome,
        especialidade,
        raio,
        botaoSelecionar
    );

    return cartao;
}


async function carregarTiposExames() {
    campoTipoExame.disabled = true;
    botaoPesquisarExame.disabled = true;

    try {
        tiposExames = await buscarTiposExames();

        campoTipoExame.replaceChildren();

        const opcaoInicial = document.createElement("option");
        opcaoInicial.value = "";
        opcaoInicial.textContent = "Selecione um exame";

        campoTipoExame.appendChild(opcaoInicial);

        tiposExames.forEach(exame => {
            const opcao = document.createElement("option");
            opcao.value = String(exame.id);
            opcao.textContent = exame.nome;

            campoTipoExame.appendChild(opcao);
        });

        mensagemTiposExame.textContent = tiposExames.length
            ? `${tiposExames.length} tipo(s) de exame encontrado(s).`
            : "Nenhum tipo de exame cadastrado.";

    } catch (erro) {
        mensagemTiposExame.textContent =
            "Não foi possível carregar os tipos de exames.";

        console.error(erro);

    } finally {
        campoTipoExame.disabled = false;
        botaoPesquisarExame.disabled = false;
    }
}


async function pesquisarProfissionaisExame(evento) {
    evento.preventDefault();

    const exameId = Number(campoTipoExame.value);

    if (!Number.isSafeInteger(exameId) || exameId <= 0) {
        mensagemProfissionaisExame.textContent =
            "Selecione um tipo de exame.";
        return;
    }

    const exame = tiposExames.find(
        item => item.id === exameId
    );

    if (!exame) {
        mensagemProfissionaisExame.textContent =
            "Tipo de exame não encontrado.";
        return;
    }

    const numeroPesquisa = ++pesquisaAtual;

    limparSelecaoExame();
    listaProfissionaisExame.replaceChildren();

    botaoPesquisarExame.disabled = true;

    mensagemProfissionaisExame.textContent =
        "Buscando profissionais...";

    try {
        const profissionais = await buscarProfissionaisExame(
            exameId
        );

        if (numeroPesquisa !== pesquisaAtual) {
            return;
        }

        if (profissionais.length === 0) {
            mensagemProfissionaisExame.textContent =
                "Nenhum profissional cadastrado para este exame.";
            return;
        }

        mensagemProfissionaisExame.textContent =
            `${profissionais.length} profissional(is) encontrado(s).`;

        profissionais.forEach(profissional => {
            listaProfissionaisExame.appendChild(
                criarCartaoExame(exame, profissional)
            );
        });

    } catch (erro) {
        if (numeroPesquisa !== pesquisaAtual) {
            return;
        }

        mensagemProfissionaisExame.textContent =
            `Erro ao buscar profissionais: ${erro.message}`;

    } finally {
        if (numeroPesquisa === pesquisaAtual) {
            botaoPesquisarExame.disabled = false;
        }
    }
}


campoTipoExame.addEventListener("change", () => {
    pesquisaAtual++;
    limparSelecaoExame();
    listaProfissionaisExame.replaceChildren();

    mensagemProfissionaisExame.textContent =
        "Clique em Buscar profissionais para continuar.";

    botaoPesquisarExame.disabled = false;
});


formularioExame.addEventListener(
    "submit",
    pesquisarProfissionaisExame
);


limparSelecaoExame();
carregarTiposExames();
