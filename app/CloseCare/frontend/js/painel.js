
const carregandoPerfil = document.getElementById("carregando-perfil");

const conteudoPerfil = document.getElementById("conteudo-perfil");

const botaoSair = document.getElementById(
    "btn-sair"
);

const mensagemPainel = document.getElementById(
    "mensagem-painel"
);

async function carregarMeusAgendamentos() {
    const lista = document.getElementById(
        "lista-consultas"
    );

    const mensagem = document.getElementById(
        "mensagem-consultas"
    );

    lista.replaceChildren();

    try {
        const agendamentos = await buscarMeusAgendamentos();

        if (agendamentos.length === 0) {
            mensagem.textContent =
                "Você ainda não possui consultas cadastradas.";
            return;
        }

        mensagem.textContent =
            `${agendamentos.length} consulta(s) encontrada(s).`;

        const formatador = new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Sao_Paulo",
            dateStyle: "short",
            timeStyle: "short"
        });

        const statusTexto = {
            agendado: "Agendado",
            cancelado: "Cancelado",
            realizado: "Realizado"
        };

        agendamentos.forEach(agendamento => {
            const cartao = document.createElement("article");
            cartao.className = "cartao-consulta";

            const titulo = document.createElement("h4");
            titulo.textContent =
                agendamento.profissional_nome;

            const especialidade = document.createElement("p");
            especialidade.textContent =
                agendamento.especialidade;

            const data = document.createElement("p");
            data.textContent =
                `Data: ${formatador.format(
                    new Date(agendamento.inicio)
                )}`;

            const status = document.createElement("span");
            status.className = "status-consulta";

            if (["agendado", "cancelado", "realizado"].includes(
                agendamento.status
            )) {
                status.classList.add(
                    `status-${agendamento.status}`
                );
            }

            status.textContent =
                statusTexto[agendamento.status] ||
                agendamento.status;

            const link = document.createElement("a");
            link.className = "link-detalhes";
            link.textContent = "Ver detalhes";

            link.href =
                `detalhes-agendamento.html?id=${agendamento.id}`;

            cartao.append(
                titulo,
                especialidade,
                data,
                status,
                link
            );

            lista.appendChild(cartao);
        });

    } catch (erro) {
        mensagem.textContent =
            "Não foi possível carregar suas consultas.";

        console.error(erro);
    }
}


async function cancelarConsultaComoProfissional(
    consultaId,
    botao
) {
    const confirmado = window.confirm(
        "Deseja realmente cancelar esta consulta?"
    );

    if (!confirmado) {
        return;
    }

    botao.disabled = true;

    try {
        await cancelarAgendamento(consultaId);

        await carregarConsultasRecebidas();

        mensagemPainel.hidden = false;
        mensagemPainel.className = "resultado sucesso";
        mensagemPainel.textContent =
            `Consulta #${consultaId} cancelada com sucesso. O horário foi liberado.`;

    } catch (erro) {
        mensagemPainel.hidden = false;
        mensagemPainel.className = "resultado erro";
        mensagemPainel.textContent =
            `Não foi possível cancelar a consulta: ${erro.message}`;

        if (erro.status === 409) {
            await carregarConsultasRecebidas();
        } else {
            botao.disabled = false;
        }

        console.error(erro);
    }
}

async function carregarConsultasRecebidas() {
    const lista = document.getElementById(
        "lista-consultas-profissional"
    );

    const mensagem = document.getElementById(
        "mensagem-consultas-profissional"
    );

    lista.replaceChildren();

    try {
        const consultas = await buscarConsultasRecebidas();

        if (consultas.length === 0) {
            mensagem.textContent =
                "Você ainda não possui consultas recebidas.";
            return;
        }

        mensagem.textContent =
            `${consultas.length} consulta(s) encontrada(s).`;

        const formatadorData = new Intl.DateTimeFormat(
            "pt-BR",
            {
                timeZone: "America/Sao_Paulo",
                dateStyle: "short",
                timeStyle: "short"
            }
        );

        const formatadorHora = new Intl.DateTimeFormat(
            "pt-BR",
            {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23"
            }
        );

        const statusTexto = {
            agendado: "Agendado",
            cancelado: "Cancelado",
            realizado: "Realizado"
        };

        consultas.forEach(consulta => {
            const cartao = document.createElement("article");
            cartao.className = "cartao-consulta";

            const titulo = document.createElement("h4");
            titulo.textContent = consulta.paciente_nome;

            const protocolo = document.createElement("p");
            protocolo.textContent =
                `Consulta #${consulta.id}`;

            const data = document.createElement("p");
            data.textContent =
                `Data: ${formatadorData.format(
                    new Date(consulta.inicio)
                )}`;

            const horario = document.createElement("p");
            horario.textContent =
                `Horário: ${formatadorHora.format(
                    new Date(consulta.inicio)
                )} às ${formatadorHora.format(
                    new Date(consulta.fim)
                )}`;

            const status = document.createElement("span");
            status.className = "status-consulta";

            if (
                ["agendado", "cancelado", "realizado"].includes(
                    consulta.status
                )
            ) {
                status.classList.add(
                    `status-${consulta.status}`
                );
            }

            status.textContent =
                statusTexto[consulta.status] ||
                consulta.status;

            cartao.append(
                titulo,
                protocolo,
                data,
                horario,
                status
            );

            if (
                consulta.status === "agendado" &&
                new Date(consulta.inicio).getTime() > Date.now()
            ) {
                const botaoCancelar = document.createElement("button");

                botaoCancelar.type = "button";
                botaoCancelar.className = "btn-cancelar-consulta";
                botaoCancelar.textContent = "Cancelar consulta";

                botaoCancelar.addEventListener("click", () => {
                    cancelarConsultaComoProfissional(
                        consulta.id,
                        botaoCancelar
                    );
                });

                cartao.appendChild(botaoCancelar);
            }

            lista.appendChild(cartao);
        });

    } catch (erro) {
        mensagem.textContent =
            "Não foi possível carregar as consultas recebidas.";

        console.error(erro);
    }
}


async function cancelarExamePeloPainel(
    agendamentoId,
    tipoUsuario,
    botao
) {
    const confirmado = window.confirm(
        "Deseja realmente cancelar este exame?"
    );

    if (!confirmado) {
        return;
    }

    botao.disabled = true;

    try {
        await cancelarAgendamentoExame(agendamentoId);

        await carregarMeusExames(tipoUsuario);

        mensagemPainel.hidden = false;
        mensagemPainel.className = "resultado sucesso";
        mensagemPainel.textContent =
            `Exame #${agendamentoId} cancelado com sucesso. O horário foi liberado.`;

    } catch (erro) {
        if (erro.status === 409 || erro.status === 404) {
            await carregarMeusExames(tipoUsuario);
        } else {
            botao.disabled = false;
        }

        mensagemPainel.hidden = false;
        mensagemPainel.className = "resultado erro";
        mensagemPainel.textContent =
            `Não foi possível cancelar o exame: ${erro.message}`;

        console.error(erro);
    }
}


async function carregarMeusExames(tipoUsuario) {
    const tipo = tipoUsuario === "profissional"
        ? "profissional"
        : "paciente";

    const lista = document.getElementById(
        `lista-exames-${tipo}`
    );

    const mensagem = document.getElementById(
        `mensagem-exames-${tipo}`
    );

    lista.replaceChildren();

    try {
        const exames = await buscarMeusExames();

        if (!Array.isArray(exames)) {
            throw new Error("Resposta inválida.");
        }

        if (exames.length === 0) {
            mensagem.textContent =
                tipo === "paciente"
                    ? "Você ainda não possui exames cadastrados."
                    : "Você ainda não possui exames recebidos.";
            return;
        }

        mensagem.textContent =
            `${exames.length} exame(s) encontrado(s).`;

        const formatadorData = new Intl.DateTimeFormat(
            "pt-BR",
            {
                timeZone: "America/Sao_Paulo",
                dateStyle: "short",
                timeStyle: "short"
            }
        );

        const formatadorHora = new Intl.DateTimeFormat(
            "pt-BR",
            {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23"
            }
        );

        const statusTexto = {
            agendado: "Agendado",
            cancelado: "Cancelado",
            realizado: "Realizado"
        };

        exames.forEach(exame => {
            const cartao = document.createElement("article");
            cartao.className = "cartao-consulta";

            const titulo = document.createElement("h4");
            titulo.textContent = exame.exame_nome;

            const protocolo = document.createElement("p");
            protocolo.textContent =
                `Protocolo: #${exame.id}`;

            const pessoa = document.createElement("p");

            if (tipo === "paciente") {
                pessoa.textContent =
                    `Profissional: ${exame.profissional_nome}`;
            } else {
                pessoa.textContent =
                    `Paciente: ${exame.paciente_nome}`;
            }

            const horario = document.createElement("p");

            horario.textContent =
                `Data e horário: ${formatadorData.format(
                    new Date(exame.inicio)
                )} às ${formatadorHora.format(
                    new Date(exame.fim)
                )}`;

            const status = document.createElement("span");
            status.className = "status-consulta";

            if (
                ["agendado", "cancelado", "realizado"].includes(
                    exame.status
                )
            ) {
                status.classList.add(
                    `status-${exame.status}`
                );
            }

            status.textContent =
                statusTexto[exame.status] ||
                exame.status;

            cartao.append(
                titulo,
                protocolo,
                pessoa,
                horario,
                status
            );

            
            if (
                exame.status === "agendado" &&
                new Date(exame.inicio).getTime() > Date.now()
            ) {
                const botaoCancelar = document.createElement("button");

                botaoCancelar.type = "button";
                botaoCancelar.className = "btn-cancelar-consulta";
                botaoCancelar.textContent = "Cancelar exame";

                botaoCancelar.addEventListener("click", () => {
                    cancelarExamePeloPainel(
                        exame.id,
                        tipo,
                        botaoCancelar
                    );
                });

                cartao.appendChild(botaoCancelar);
            }
            
            lista.appendChild(cartao);
        });

    } catch (erro) {
        mensagem.textContent =
            "Não foi possível carregar os exames.";

        console.error(erro);
    }
}


async function carregarPerfil() {

    try {

        const usuario = await obterUsuarioAtual();

        document.getElementById(
            "boas-vindas"
        ).textContent = `Bem-vindo(a), ${usuario.nome}!`;

        document.getElementById(
            "perfil-nome"
        ).textContent = usuario.nome;

        document.getElementById(
            "perfil-email"
        ).textContent = usuario.email;

        document.getElementById(
            "perfil-tipo"
        ).textContent = usuario.tipo_usuario;

        
        if (usuario.tipo_usuario === "paciente") {
            carregarMeusAgendamentos();
            carregarMeusExames("paciente");

            document.getElementById(
                "area-paciente"
            ).hidden = false;
        }else if (
            usuario.tipo_usuario === "profissional"
        ) {
            carregarConsultasRecebidas();
            carregarMeusExames("profissional");

            document.getElementById(
                "area-profissional"
            ).hidden = false;
        }



        carregandoPerfil.hidden = true;
        conteudoPerfil.hidden = false;

    } catch (erro) {

        carregandoPerfil.textContent =
            "Não foi possível validar sua sessão.";

        window.location.replace("login.html");

    }
}

botaoSair.addEventListener("click", async () => {

    botaoSair.disabled = true;

    try {

        await logoutUsuario();

        window.location.replace("login.html");

    } catch (erro) {

        mensagemPainel.hidden = false;

        mensagemPainel.textContent =
            "Não foi possível encerrar a sessão. Tente novamente.";

        mensagemPainel.className = "resultado erro";

        botaoSair.disabled = false;

    }
});

carregarPerfil();
