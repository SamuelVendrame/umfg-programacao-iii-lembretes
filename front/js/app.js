const API_URL = "https://localhost:7063";

const estado = {
    pagina: 1,
    ordem: "DataCadastro",
    direcao: "DESC",
    totalPaginas: 1,
    filtros: {}
};

const formulario = document.getElementById("formulario");
const formLembrete = document.getElementById("formLembrete");
const tituloFormulario = document.getElementById("tituloFormulario");
const lembreteId = document.getElementById("lembreteId");
const descricao = document.getElementById("descricao");
const erroDescricao = document.getElementById("erroDescricao");
const contadorDescricao = document.getElementById("contadorDescricao");
const btnSalvar = document.getElementById("btnSalvar");

const formFiltro = document.getElementById("formFiltro");
const filtroDescricao = document.getElementById("filtroDescricao");
const filtroCadastroInicial = document.getElementById("filtroCadastroInicial");
const filtroCadastroFinal = document.getElementById("filtroCadastroFinal");
const filtroAtualizacaoInicial = document.getElementById("filtroAtualizacaoInicial");
const filtroAtualizacaoFinal = document.getElementById("filtroAtualizacaoFinal");
const erroFiltro = document.getElementById("erroFiltro");

const listaLembretes = document.getElementById("listaLembretes");
const carregando = document.getElementById("carregando");
const mensagemVazia = document.getElementById("mensagemVazia");
const mensagemErro = document.getElementById("mensagemErro");
const textoErro = document.getElementById("textoErro");
const totalRegistros = document.getElementById("totalRegistros");
const tamanhoPagina = document.getElementById("tamanhoPagina");
const cabecalhosOrdenaveis = document.querySelectorAll("th[data-ordem]");

const infoPaginacao = document.getElementById("infoPaginacao");
const paginaAtualElemento = document.getElementById("paginaAtual");
const paginas = document.getElementById("paginas");
const btnAnterior = document.getElementById("btnAnterior");
const btnProximo = document.getElementById("btnProximo");

const dialogoExcluir = document.getElementById("dialogoExcluir");
const textoExcluir = document.getElementById("textoExcluir");

class ErroApi extends Error {
    constructor(mensagem, status) {
        super(mensagem);
        this.status = status;
    }
}

async function requisicao(caminho, opcoes = {}) {
    let response;

    try {
        response = await fetch(`${API_URL}${caminho}`, opcoes);
    } catch (error) {
        throw new ErroApi("Não foi possível se comunicar com a API. Verifique se ela está em execução.", 0);
    }

    if (!response.ok) {
        let mensagem = "";

        try {
            const texto = await response.text();
            mensagem = texto ? JSON.parse(texto) : "";
        } catch {
            mensagem = "";
        }

        if (typeof mensagem !== "string" || !mensagem) {
            mensagem = mensagemPorStatus(response.status);
        }

        throw new ErroApi(mensagem, response.status);
    }

    return response;
}

function mensagemPorStatus(status) {
    if (status === 400) return "A requisição enviada é inválida.";
    if (status === 404) return "Lembrete não encontrado.";
    if (status >= 500) return "A API encontrou um erro interno. Tente novamente.";
    return `Erro inesperado (HTTP ${status}).`;
}

function montarParametros() {
    const params = new URLSearchParams();

    params.append("NumeroPagina", estado.pagina);
    params.append("TamanhoPagina", tamanhoPagina.value);
    params.append("Ordem", estado.ordem);
    params.append("Direcao", estado.direcao);

    Object.entries(estado.filtros).forEach(([chave, valor]) => {
        if (valor) {
            params.append(chave, valor);
        }
    });

    return params;
}

function aplicarFiltros() {
    const erro = validarFiltros();
    erroFiltro.textContent = erro;

    if (erro) {
        mostrarToast(erro, "erro");
        return false;
    }

    estado.filtros = {
        Descricao: filtroDescricao.value.trim(),
        DataCadastroInicial: filtroCadastroInicial.value,
        DataCadastroFinal: filtroCadastroFinal.value,
        DataAtualizacaoInicial: filtroAtualizacaoInicial.value,
        DataAtualizacaoFinal: filtroAtualizacaoFinal.value
    };

    return true;
}

function validarFiltros() {
    if (filtroCadastroInicial.value && filtroCadastroFinal.value
        && filtroCadastroInicial.value > filtroCadastroFinal.value) {
        return "A data de cadastro inicial não pode ser maior que a final.";
    }

    if (filtroAtualizacaoInicial.value && filtroAtualizacaoFinal.value
        && filtroAtualizacaoInicial.value > filtroAtualizacaoFinal.value) {
        return "A data de atualização inicial não pode ser maior que a final.";
    }

    return "";
}

async function filtrarLembretes() {
    mostrarEstado("carregando");

    try {
        const response = await requisicao(`/lembretes/filtro?${montarParametros()}`);
        const resultado = await response.json();

        const total = Number(resultado.total) || 0;
        const tamanho = Number(resultado.tamanhoPagina) || Number(tamanhoPagina.value);
        estado.totalPaginas = Math.max(1, Math.ceil(total / tamanho));

        if (resultado.lembretes.length === 0 && total > 0 && estado.pagina > estado.totalPaginas) {
            estado.pagina = estado.totalPaginas;
            return filtrarLembretes();
        }

        renderizarLembretes(resultado.lembretes);
        atualizarPaginacao(total, tamanho, resultado.lembretes.length);
    } catch (error) {
        console.error(error);
        listaLembretes.innerHTML = "";
        textoErro.textContent = error.message;
        mostrarEstado("erro");
        atualizarPaginacao(0, Number(tamanhoPagina.value), 0);
        totalRegistros.classList.add("hidden");
        mostrarToast(error.message, "erro");
    }
}

async function imprimirLembretes() {
    try {
        const response = await requisicao(`/lembretes/imprimir?${montarParametros()}`);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "relatorio-lembretes.pdf";
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 10000);

        mostrarToast("Relatório gerado com sucesso!", "sucesso");
    } catch (error) {
        console.error(error);
        mostrarToast(`Não foi possível gerar o relatório. ${error.message}`, "erro");
    }
}

async function criarLembrete(texto) {
    await requisicao("/lembretes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao: texto })
    });

    mostrarToast("Lembrete cadastrado com sucesso!", "sucesso");
    estado.pagina = 1;
}

async function buscarLembrete(id) {
    try {
        const response = await requisicao(`/lembretes/${id}`);
        const lembrete = await response.json();

        abrirFormulario(lembrete);
    } catch (error) {
        console.error(error);
        mostrarToast(`Não foi possível buscar o lembrete. ${error.message}`, "erro");
    }
}

async function atualizarLembrete(id, texto) {
    await requisicao(`/lembretes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descricao: texto })
    });

    mostrarToast("Lembrete atualizado com sucesso!", "sucesso");
}

async function excluirLembrete(lembrete) {
    const confirmou = await confirmarExclusao(lembrete.descricao);

    if (!confirmou) {
        return;
    }

    try {
        await requisicao(`/lembretes/${lembrete.id}`, { method: "DELETE" });

        mostrarToast("Lembrete excluído com sucesso!", "sucesso");

        if (lembreteId.value === lembrete.id) {
            fecharFormulario();
        }

        await filtrarLembretes();
    } catch (error) {
        console.error(error);
        mostrarToast(`Não foi possível excluir o lembrete. ${error.message}`, "erro");
    }
}

function confirmarExclusao(texto) {
    textoExcluir.textContent = `"${resumir(texto, 60)}"`;
    dialogoExcluir.returnValue = "";
    dialogoExcluir.showModal();

    return new Promise(resolve => {
        dialogoExcluir.addEventListener("close", () => {
            resolve(dialogoExcluir.returnValue === "confirmar");
        }, { once: true });
    });
}

function renderizarLembretes(lembretes) {
    listaLembretes.innerHTML = "";

    if (!lembretes || lembretes.length === 0) {
        mostrarEstado("vazio");
        return;
    }

    mostrarEstado("lista");

    lembretes.forEach(lembrete => {
        const tr = document.createElement("tr");

        tr.appendChild(criarCelula("Descrição", lembrete.descricao, "celula-descricao"));
        tr.appendChild(criarCelula("Cadastro", formatarData(lembrete.dataCadastro)));
        tr.appendChild(criarCelula("Atualização", formatarData(lembrete.dataAtualizacao)));

        const status = document.createElement("span");
        status.className = `status ${lembrete.isAtivo ? "status-ativo" : "status-inativo"}`;
        status.textContent = lembrete.isAtivo ? "Ativo" : "Inativo";
        tr.appendChild(criarCelula("Status", status));

        const acoes = document.createElement("div");
        acoes.className = "acoes";
        acoes.appendChild(criarBotao("Editar", "btn-editar", () => buscarLembrete(lembrete.id)));
        acoes.appendChild(criarBotao("Excluir", "btn-excluir", () => excluirLembrete(lembrete)));
        tr.appendChild(criarCelula("Ações", acoes, "col-acoes"));

        listaLembretes.appendChild(tr);
    });
}

function criarCelula(rotulo, conteudo, classe = "") {
    const td = document.createElement("td");
    td.dataset.rotulo = rotulo;

    if (classe) {
        td.className = classe;
    }

    if (conteudo instanceof Node) {
        td.appendChild(conteudo);
    } else {
        td.textContent = conteudo;
    }

    return td;
}

function criarBotao(texto, classe, acao) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = `btn btn-pequeno ${classe}`;
    botao.textContent = texto;
    botao.addEventListener("click", acao);
    return botao;
}

function mostrarEstado(qual) {
    carregando.classList.toggle("hidden", qual !== "carregando");
    mensagemVazia.classList.toggle("hidden", qual !== "vazio");
    mensagemErro.classList.toggle("hidden", qual !== "erro");
    listaLembretes.classList.toggle("hidden", qual !== "lista");
}

function atualizarPaginacao(total, tamanho, quantidadeNaPagina) {
    totalRegistros.textContent = `${total} ${total === 1 ? "registro" : "registros"}`;
    totalRegistros.classList.remove("hidden");
    document.querySelector(".paginacao").classList.toggle("hidden", total === 0);

    if (total === 0) {
        infoPaginacao.textContent = "Nenhum registro";
    } else {
        const inicio = (estado.pagina - 1) * tamanho + 1;
        const fim = inicio + quantidadeNaPagina - 1;
        infoPaginacao.textContent = `Exibindo ${inicio}–${fim} de ${total}`;
    }

    paginaAtualElemento.textContent = `Página ${estado.pagina} de ${estado.totalPaginas}`;
    btnAnterior.disabled = estado.pagina <= 1;
    btnProximo.disabled = estado.pagina >= estado.totalPaginas;

    paginas.innerHTML = "";

    numerosDePagina(estado.pagina, estado.totalPaginas).forEach(numero => {
        if (numero === "...") {
            const reticencias = document.createElement("span");
            reticencias.className = "reticencias";
            reticencias.textContent = "…";
            paginas.appendChild(reticencias);
            return;
        }

        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "btn-pagina";
        botao.textContent = numero;

        if (numero === estado.pagina) {
            botao.classList.add("ativa");
            botao.setAttribute("aria-current", "page");
        }

        botao.addEventListener("click", () => irParaPagina(numero));
        paginas.appendChild(botao);
    });
}

function numerosDePagina(atual, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const lista = [1];
    const inicio = Math.max(2, atual - 1);
    const fim = Math.min(total - 1, atual + 1);

    if (inicio > 2) lista.push("...");
    for (let i = inicio; i <= fim; i++) lista.push(i);
    if (fim < total - 1) lista.push("...");

    lista.push(total);
    return lista;
}

function irParaPagina(numero) {
    if (numero < 1 || numero > estado.totalPaginas || numero === estado.pagina) {
        return;
    }

    estado.pagina = numero;
    filtrarLembretes();
}

function ordenarPor(campo) {
    if (estado.ordem === campo) {
        estado.direcao = estado.direcao === "ASC" ? "DESC" : "ASC";
    } else {
        estado.ordem = campo;
        estado.direcao = "ASC";
    }

    estado.pagina = 1;
    atualizarCabecalhos();
    filtrarLembretes();
}

function atualizarCabecalhos() {
    cabecalhosOrdenaveis.forEach(th => {
        const ativo = th.dataset.ordem === estado.ordem;
        const ordem = estado.direcao === "ASC" ? "ascending" : "descending";

        th.setAttribute("aria-sort", ativo ? ordem : "none");
        th.classList.toggle("ordenado", ativo);
    });
}

function abrirFormulario(lembrete = null) {
    limparErroDescricao();

    lembreteId.value = lembrete ? lembrete.id : "";
    descricao.value = lembrete ? lembrete.descricao : "";
    tituloFormulario.textContent = lembrete ? "Editar lembrete" : "Novo lembrete";
    btnSalvar.textContent = lembrete ? "Salvar alterações" : "Salvar";
    formulario.classList.toggle("editando", Boolean(lembrete));

    atualizarContador();
    formulario.classList.remove("hidden");
    formulario.scrollIntoView({ behavior: "smooth", block: "start" });
    descricao.focus({ preventScroll: true });
}

function fecharFormulario() {
    formulario.classList.add("hidden");
    formLembrete.reset();
    lembreteId.value = "";
    limparErroDescricao();
    atualizarContador();
}

function limparErroDescricao() {
    erroDescricao.textContent = "";
    descricao.classList.remove("invalido");
    descricao.removeAttribute("aria-invalid");
}

function atualizarContador() {
    contadorDescricao.textContent = `${descricao.value.length}/500`;
}

async function salvarLembrete(event) {
    event.preventDefault();

    const texto = descricao.value.trim();

    if (!texto) {
        erroDescricao.textContent = "A descrição é obrigatória.";
        descricao.classList.add("invalido");
        descricao.setAttribute("aria-invalid", "true");
        descricao.focus();
        mostrarToast("Preencha a descrição do lembrete.", "aviso");
        return;
    }

    btnSalvar.disabled = true;

    try {
        if (lembreteId.value) {
            await atualizarLembrete(lembreteId.value, texto);
        } else {
            await criarLembrete(texto);
        }

        fecharFormulario();
        await filtrarLembretes();
    } catch (error) {
        console.error(error);
        const acao = lembreteId.value ? "atualizar" : "cadastrar";
        mostrarToast(`Não foi possível ${acao} o lembrete. ${error.message}`, "erro");
    } finally {
        btnSalvar.disabled = false;
    }
}

function limparFiltros() {
    formFiltro.reset();
    erroFiltro.textContent = "";
    estado.filtros = {};
    estado.pagina = 1;
    filtrarLembretes();
}

function formatarData(data) {
    if (!data) {
        return "-";
    }

    return new Date(data).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function resumir(texto, limite) {
    return texto.length > limite ? `${texto.slice(0, limite)}…` : texto;
}

function mostrarToast(mensagem, tipo = "info") {
    const container = document.getElementById("toasts");
    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    toast.setAttribute("role", tipo === "erro" ? "alert" : "status");
    toast.textContent = mensagem;

    container.appendChild(toast);

    while (container.children.length > 3) {
        container.firstElementChild.remove();
    }

    requestAnimationFrame(() => toast.classList.add("visivel"));

    setTimeout(() => {
        toast.classList.remove("visivel");
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

document.getElementById("btnNovo").addEventListener("click", () => abrirFormulario());
document.getElementById("btnCancelar").addEventListener("click", fecharFormulario);
document.getElementById("btnFecharFormulario").addEventListener("click", fecharFormulario);
document.getElementById("btnImprimir").addEventListener("click", imprimirLembretes);
document.getElementById("btnLimpar").addEventListener("click", limparFiltros);
document.getElementById("btnTentarNovamente").addEventListener("click", filtrarLembretes);

formLembrete.addEventListener("submit", salvarLembrete);

descricao.addEventListener("input", () => {
    atualizarContador();

    if (descricao.value.trim()) {
        limparErroDescricao();
    }
});

formFiltro.addEventListener("submit", event => {
    event.preventDefault();

    if (!aplicarFiltros()) {
        return;
    }

    estado.pagina = 1;
    filtrarLembretes();
});

tamanhoPagina.addEventListener("change", () => {
    estado.pagina = 1;
    filtrarLembretes();
});

cabecalhosOrdenaveis.forEach(th => {
    th.querySelector("button").addEventListener("click", () => ordenarPor(th.dataset.ordem));
});

btnAnterior.addEventListener("click", () => irParaPagina(estado.pagina - 1));
btnProximo.addEventListener("click", () => irParaPagina(estado.pagina + 1));

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !formulario.classList.contains("hidden") && !dialogoExcluir.open) {
        fecharFormulario();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    atualizarCabecalhos();
    filtrarLembretes();
});
