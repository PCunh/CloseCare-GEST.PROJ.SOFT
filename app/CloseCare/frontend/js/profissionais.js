
const formularioPesquisa = document.getElementById(
    "form-pesquisa"
);

const campoEspecialidade = document.getElementById(
    "especialidade"
);

const botaoPesquisar = document.getElementById(
    "btn-pesquisar"
);

const botaoLimpar = document.getElementById(
    "btn-limpar"
);

const resultadoPesquisa = document.getElementById(
    "resultado-pesquisa"
);

const listaProfissionais = document.getElementById(
    "lista-profissionais"
);

const mensagemFiltro = document.getElementById(
    "mensagem-filtro"
);



function criarCartaoProfissional(profissional) {
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

    const linkHorarios = document.createElement("a");
    linkHorarios.className = "botao botao-horarios";
    linkHorarios.textContent = "Ver horários";

    linkHorarios.href =
        `agendamento.html?profissional_id=${profissional.id}`;

    cartao.append(
        nome,
        especialidade,
        raio,
        linkHorarios
    );

    return cartao;
}


async function carregarProfissionais() {
    botaoPesquisar.disabled = true;

    listaProfissionais.replaceChildren();

    resultadoPesquisa.className = "";
    resultadoPesquisa.textContent = "Carregando profissionais...";

    try {
        const especialidade = campoEspecialidade.value;

        const profissionais = await buscarProfissionais(
            especialidade
        );

        const quantidade = profissionais.length;

        resultadoPesquisa.textContent =
            `${quantidade} profissional(is) encontrado(s).`;

        if (quantidade === 0) {
            resultadoPesquisa.textContent =
                "Nenhum profissional encontrado para esta especialidade.";

            return;
        }

        const fragmento = document.createDocumentFragment();

        profissionais.forEach(profissional => {
            const cartao = criarCartaoProfissional(
                profissional
            );

            fragmento.appendChild(cartao);
        });

        listaProfissionais.appendChild(fragmento);

    } catch (erro) {
        resultadoPesquisa.textContent =
            "Não foi possível carregar os profissionais.";

        resultadoPesquisa.className = "erro";

        console.error("Erro na pesquisa:", erro);

    } finally {
        botaoPesquisar.disabled = false;
    }
}


async function carregarEspecialidades() {
    try {
        const especialidades = await buscarEspecialidades();

        especialidades.forEach(especialidade => {
            const opcao = document.createElement("option");

            opcao.value = especialidade;
            opcao.textContent = especialidade;

            campoEspecialidade.appendChild(opcao);
        });

    } catch (erro) {
        mensagemFiltro.textContent =
            "Não foi possível carregar as especialidades.";

        console.error("Erro nas especialidades:", erro);
    }
}


formularioPesquisa.addEventListener(
    "submit",
    async (evento) => {
        evento.preventDefault();

        await carregarProfissionais();
    }
);


botaoLimpar.addEventListener("click", async () => {
    campoEspecialidade.value = "";

    await carregarProfissionais();
});


async function inicializarPagina() {
    await carregarEspecialidades();

    await carregarProfissionais();
}


inicializarPagina();
