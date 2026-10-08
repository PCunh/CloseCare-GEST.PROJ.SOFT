
const formulario = document.getElementById("form-cadastro");

const tipoUsuario = document.getElementById("tipo-usuario");

const camposPaciente = document.getElementById(
    "campos-paciente"
);

const camposProfissional = document.getElementById(
    "campos-profissional"
);

const campoEspecialidade = document.getElementById(
    "especialidade"
);

const botaoCadastrar = document.getElementById(
    "btn-cadastrar"
);

const mensagemCadastro = document.getElementById(
    "mensagem-cadastro"
);

function mostrarMensagem(texto, tipo) {
    mensagemCadastro.hidden = false;

    mensagemCadastro.textContent = texto;

    mensagemCadastro.className = `resultado ${tipo}`;
}

function atualizarCampos() {

    const tipo = tipoUsuario.value;

    camposPaciente.hidden = tipo !== "paciente";

    camposProfissional.hidden = tipo !== "profissional";

    campoEspecialidade.required = tipo === "profissional";
}

tipoUsuario.addEventListener("change", atualizarCampos);

formulario.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    const nome = document.getElementById("nome").value.trim();

    const email = document.getElementById("email")
        .value.trim().toLowerCase();

    const senha = document.getElementById("senha").value;

    const confirmarSenha = document.getElementById(
        "confirmar-senha"
    ).value;

    const tipo = tipoUsuario.value;

    if (senha !== confirmarSenha) {
        mostrarMensagem(
            "As senhas informadas não são iguais.",
            "erro"
        );
        return;
    }

    const dados = {
        nome: nome,
        email: email,
        senha: senha,
        tipo_usuario: tipo
    };

    if (tipo === "paciente") {

        const telefone = document.getElementById(
            "telefone"
        ).value.trim();

        const endereco = document.getElementById(
            "endereco"
        ).value.trim();

        dados.telefone = telefone || null;
        dados.endereco = endereco || null;

    }

    if (tipo === "profissional") {

        const especialidade = document.getElementById(
            "especialidade"
        ).value.trim();

        const raio = document.getElementById(
            "raio-atendimento"
        ).value;

        if (!especialidade) {
            mostrarMensagem(
                "Informe a especialidade profissional.",
                "erro"
            );
            return;
        }

        dados.especialidade = especialidade;

        dados.raio_atendimento_km =
            raio === "" ? 10 : Number(raio);

    }

    botaoCadastrar.disabled = true;

    mostrarMensagem("Cadastrando usuário...", "");


    try {
        const resposta = await cadastrarUsuario(dados);

        mostrarMensagem(
            `Cadastro realizado com sucesso! Bem-vindo(a), ${resposta.nome}.`,
            "sucesso"
        );

        console.log("Usuário cadastrado:", resposta);

        formulario.reset();

        atualizarCampos();

    } catch (erro) {

        mostrarMensagem(
            erro.message,
            "erro"
        );

        console.error("Erro no cadastro:", erro);

    } finally {

        botaoCadastrar.disabled = false;

    }
});

atualizarCampos();
