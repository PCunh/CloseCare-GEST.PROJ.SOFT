
const navegacaoPrincipal = document.getElementById("navegacao-principal");

function adicionarLinkCabecalho(texto, destino) {
    const link = document.createElement("a");

    link.href = destino;
    link.textContent = texto;

    const paginaAtual =
        window.location.pathname.split("/").pop() || "index.html";

    if (paginaAtual === destino) {
        link.setAttribute("aria-current", "page");
    }

    navegacaoPrincipal.appendChild(link);
}

async function atualizarCabecalho() {
    if (!navegacaoPrincipal) {
        return;
    }

    const paginaAtual =
        window.location.pathname.split("/").pop() || "index.html";

    navegacaoPrincipal.querySelectorAll("a").forEach(link => {
        if (link.getAttribute("href") === paginaAtual) {
            link.setAttribute("aria-current", "page");
        }
    });

    try {
        await obterUsuarioAtual();

        adicionarLinkCabecalho("Minha conta", "painel.html");

    } catch (erro) {
        if (erro.status === 401) {
            adicionarLinkCabecalho("Entrar", "login.html");
            adicionarLinkCabecalho("Cadastrar", "cadastro.html");
        } else {
            console.error(
                "Não foi possível verificar a sessão:",
                erro
            );
        }
    }
}

atualizarCabecalho();
