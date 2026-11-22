// Página "Como platinar GTA 6": lista dos 55 troféus (dados/trofeus.json, arquivo estático),
// progresso de cada visitante salvo SÓ no navegador dele (localStorage), filtros e spoilers.
// Regra do site: todo texto entra com textContent (função el()), links só https.
(async function () {
  "use strict";
  const { el, limpar, semAcento, aviso, host } = window.U;
  const $ = (s) => document.querySelector(s);

  const TIPOS = {
    platina: { nome: "Platina", ordem: 0 },
    ouro: { nome: "Ouro", ordem: 1 },
    prata: { nome: "Prata", ordem: 2 },
    bronze: { nome: "Bronze", ordem: 3 },
  };
  const CHAVE = "platina-gta6-v1";

  // ---------- Progresso salvo (pode falhar: aba anônima, armazenamento bloqueado) ----------
  const salvo = { conquistados: new Set(), lista100: new Set() };
  let podeSalvar = true;
  function numerosValidos(lista, max) {
    return (Array.isArray(lista) ? lista : []).filter(
      (n) => Number.isInteger(n) && n >= 1 && n <= max,
    );
  }
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) || "null");
    if (bruto && typeof bruto === "object") {
      numerosValidos(bruto.conquistados, 999).forEach((n) =>
        salvo.conquistados.add(n),
      );
      numerosValidos(bruto.lista100, 99).forEach((n) => salvo.lista100.add(n));
    }
  } catch (e) {
    podeSalvar = false;
  }
  function gravar() {
    try {
      localStorage.setItem(
        CHAVE,
        JSON.stringify({
          conquistados: [...salvo.conquistados].sort((a, b) => a - b),
          lista100: [...salvo.lista100].sort((a, b) => a - b),
        }),
      );
    } catch (e) {
      if (podeSalvar)
        aviso(
          "Este navegador não deixou salvar. O progresso some ao fechar.",
          "erro",
        );
      podeSalvar = false;
      mostrarSalvo();
    }
  }
  function mostrarSalvo() {
    $("#pl-salvo-texto").textContent = podeSalvar
      ? "Fica salvo neste navegador (sem login). Em outro aparelho, use a cópia."
      : "Este navegador não está salvando (aba anônima?). Baixe uma cópia antes de sair.";
  }
  mostrarSalvo();

  // ---------- Dados ----------
  let dados;
  try {
    const r = await fetch("dados/trofeus.json", { cache: "no-cache" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    dados = await r.json();
    if (!Array.isArray(dados.trofeus) || !dados.trofeus.length)
      throw new Error("vazio");
  } catch (e) {
    $("#pl-carregando").textContent =
      "Não consegui carregar a lista de troféus. Recarregue a página.";
    document.documentElement.dataset.pronto = "1";
    return;
  }
  $("#pl-carregando").hidden = true;

  const trofeus = dados.trofeus
    .filter((t) => t && Number.isInteger(t.n) && TIPOS[t.tipo])
    .sort((a, b) => a.n - b.n);
  const total = trofeus.length;
  const totalPorTipo = {};
  for (const t of trofeus)
    totalPorTipo[t.tipo] = (totalPorTipo[t.tipo] || 0) + 1;
  // só vale número que existe na lista
  for (const n of [...salvo.conquistados])
    if (!trofeus.some((t) => t.n === n)) salvo.conquistados.delete(n);

  const roteiro = dados.roteiro || {};
  const perdivel = (t) => !!(t.perdivel && t.perdivel.perdivel);
  const poucasFontes = (t) => !/^confirmado/i.test(String(t.confianca || ""));
  const texto = (v) =>
    typeof v === "string" ? v : v === null || v === undefined ? "" : String(v);

  // ---------- Resumo no topo ----------
  const fatos = [
    [
      "Dificuldade",
      texto(roteiro.dificuldade).replace(/\s*\(.*\)$/, "") || "4/10",
    ],
    [
      "Tempo",
      texto(roteiro.horas)
        .split(";")[0]
        .replace(/\s*\(.*\)$/, "") || "~200 h",
    ],
    ["Jogadas", String(roteiro.jogadas || 1)],
    ["Troféus online", "0"],
    ["Troféus", String(total)],
  ];
  const caixaFatos = $("#pl-fatos");
  for (const [rotulo, valor] of fatos)
    caixaFatos.append(
      el(
        "li",
        null,
        el("span", { class: "pl-fato-rotulo", text: rotulo }),
        el("strong", { class: "pl-fato-valor", text: valor }),
      ),
    );

  // ---------- Aviso: perdíveis e trapaças ----------
  const alerta = $("#pl-alerta-lista");
  for (const t of trofeus.filter(perdivel))
    alerta.append(
      el(
        "li",
        { class: "pl-alerta-perdivel" },
        el("span", { class: "pl-selo pl-selo-perdivel", text: "Perdível" }),
        " ",
        el("strong", { text: t.nome_original }),
        poucasFontes(t) ? " (não confirmado)" : "",
        ": " +
          texto(t.perdivel.motivo).replace(/^Possivelmente perdível:\s*/i, ""),
        t.perdivel.ate_quando ? " Faça " + t.perdivel.ate_quando + "." : "",
        " ",
        botaoIrPara(t),
      ),
    );
  if (roteiro.trapacas)
    alerta.append(
      el(
        "li",
        null,
        el("span", { class: "pl-selo pl-selo-aviso", text: "Trapaças" }),
        " ",
        texto(roteiro.trapacas),
      ),
    );
  alerta.append(
    el(
      "li",
      null,
      el("span", { class: "pl-selo pl-selo-ok", text: "Tranquilo" }),
      " Nenhum troféu online. ",
      texto(roteiro.bugados)
        ? "Bugados: " + texto(roteiro.bugados).toLowerCase()
        : "",
      roteiro.free_roam_pos_historia
        ? " Dá para continuar jogando depois do fim da história."
        : "",
    ),
  );

  function botaoIrPara(t) {
    return el("a", {
      class: "pl-ir",
      href: "#trofeu-" + t.n,
      text: "Ver troféu",
    });
  }

  // ---------- Roteiro ----------
  const etapas = $("#pl-etapas");
  for (const e of Array.isArray(roteiro.etapas) ? roteiro.etapas : [])
    etapas.append(
      el(
        "li",
        { class: "pl-etapa cartao" },
        el("p", { class: "pl-etapa-num", text: "Etapa " + texto(e.etapa) }),
        el("h3", { class: "pl-h3", text: texto(e.nome) }),
        el("p", { class: "pl-etapa-horas", text: texto(e.horas) + " h" }),
        el("p", { class: "pl-etapa-texto", text: texto(e.o_que) }),
      ),
    );

  const dificil = trofeus.find((t) => /long road/i.test(t.nome_original));
  if (dificil) {
    $("#pl-dificil-nome").textContent = dificil.nome_original;
    $("#pl-dificil-texto").textContent =
      texto(dificil.descricao) +
      " A lista abre depois da história (Progresso > Estatísticas). Marque o que já fechou:";
  }
  const checklist = $("#pl-checklist");
  (Array.isArray(dados.lista_100) ? dados.lista_100 : []).forEach((item, i) => {
    const n = i + 1;
    const id = "pl-l100-" + n;
    const caixa = el("input", { type: "checkbox", id });
    caixa.checked = salvo.lista100.has(n);
    caixa.addEventListener("change", () => {
      caixa.checked ? salvo.lista100.add(n) : salvo.lista100.delete(n);
      gravar();
    });
    checklist.append(
      el("li", null, caixa, el("label", { for: id, text: texto(item) })),
    );
  });

  // ---------- Progresso ----------
  function atualizarProgresso() {
    const feitos = trofeus.filter((t) => salvo.conquistados.has(t.n)).length;
    const pct = total ? Math.round((feitos / total) * 100) : 0;
    $("#pl-prog-num").textContent = feitos + " de " + total + " · " + pct + "%";
    const barra = $("#pl-barra");
    barra.max = total;
    barra.value = feitos;
    barra.setAttribute("aria-valuetext", feitos + " de " + total + " troféus");
    const tipos = limpar($("#pl-tipos"));
    for (const tipo of ["bronze", "prata", "ouro", "platina"]) {
      const n = trofeus.filter(
        (t) => t.tipo === tipo && salvo.conquistados.has(t.n),
      ).length;
      tipos.append(
        el(
          "li",
          { class: "pl-tipo-conta pl-t-" + tipo },
          el("span", { class: "pl-tipo-nome", text: TIPOS[tipo].nome }),
          el("strong", { text: n + "/" + (totalPorTipo[tipo] || 0) }),
        ),
      );
    }
  }

  // ---------- Lista ----------
  const filtro = {
    busca: "",
    tipo: "",
    status: "",
    soPerdiveis: false,
    spoilers: false,
  };
  const revelados = new Set();

  function linkMapa(t) {
    const destino =
      (dados.mapa_links_trofeu && dados.mapa_links_trofeu[t.n]) ||
      (t.categoria && dados.mapa_links && dados.mapa_links[t.categoria]);
    if (!destino) return null;
    const q = new URLSearchParams();
    if (/^[a-z-]{2,20}$/.test(destino.categoria || ""))
      q.set("categoria", destino.categoria);
    if (destino.busca) q.set("busca", String(destino.busca).slice(0, 60));
    if (![...q.keys()].length) return null;
    const a = el("a", {
      class: "btn btn-fantasma btn-peq pl-ver-mapa",
      text: "Ver no mapa",
    });
    a.setAttribute("href", "index.html?" + q.toString()); // montado aqui, nunca vem de fora
    return a;
  }

  function cartao(t) {
    const feito = salvo.conquistados.has(t.n);
    const escondido = t.spoiler && !filtro.spoilers && !revelados.has(t.n);
    const selos = el(
      "div",
      { class: "pl-selos" },
      el("span", { class: "pl-tipo pl-t-" + t.tipo, text: TIPOS[t.tipo].nome }),
    );
    if (perdivel(t))
      selos.append(
        el("span", {
          class: "pl-selo pl-selo-perdivel",
          text:
            "Perdível" +
            (t.perdivel.ate_quando ? ": " + t.perdivel.ate_quando : ""),
        }),
      );
    if (poucasFontes(t))
      selos.append(
        el("span", {
          class: "pl-selo pl-selo-aviso",
          title: "Só 1 ou 2 guias confirmam o jeito de pegar.",
          text: "Poucas fontes",
        }),
      );
    if (t.oculto)
      selos.append(el("span", { class: "pl-selo", text: "Oculto" }));
    if (t.spoiler)
      selos.append(el("span", { class: "pl-selo", text: "História" }));

    const corpo = el(
      "div",
      { class: "pl-corpo" },
      el("h3", { class: "pl-nome", text: t.nome_original }),
      el("p", { class: "pl-traducao", text: "Tradução: " + texto(t.nome_pt) }),
      el("p", { class: "pl-descricao", text: texto(t.descricao) }),
      el(
        "div",
        { class: "pl-como" },
        el("p", { class: "pl-rotulo", text: "Como conseguir" }),
        el("p", { text: texto(t.como_conseguir) }),
      ),
      ...((dados.contagens && dados.contagens[t.n]) || []).map((c) =>
        el("p", { class: "pl-contagem", text: texto(c) }),
      ),
    );
    if (perdivel(t) && t.perdivel.motivo)
      corpo.append(
        el("p", { class: "pl-perdivel-texto", text: texto(t.perdivel.motivo) }),
      );

    const fontes = (Array.isArray(t.fontes) ? t.fontes : [])
      .map((f) =>
        el(
          "li",
          null,
          el("a", {
            href: f,
            target: "_blank",
            rel: "noopener noreferrer",
            text: host(f) || "fonte",
          }),
        ),
      )
      .filter((li) => li.firstChild.hasAttribute("href"));

    const btn = el("button", {
      type: "button",
      class: "pl-conquistei",
      "aria-pressed": String(feito),
      "aria-label":
        (feito ? "Conquistado: " : "Marcar como conquistado: ") +
        (escondido ? "troféu de história nº " + t.n : t.nome_original),
      text: feito ? "Conquistado" : "Conquistei",
      onclick: () => {
        salvo.conquistados.has(t.n)
          ? salvo.conquistados.delete(t.n)
          : salvo.conquistados.add(t.n);
        gravar();
        atualizarProgresso();
        trocarCartao(t);
      },
    });

    const artigo = el(
      "article",
      {
        class:
          "pl-trofeu" +
          (feito ? " feito" : "") +
          (perdivel(t) ? " perdivel" : ""),
        "aria-labelledby": "pl-nome-" + t.n,
      },
      el(
        "div",
        { class: "pl-cabeca" },
        el("span", { class: "pl-num", text: "#" + t.n }),
        selos,
      ),
    );
    corpo.querySelector(".pl-nome").id = "pl-nome-" + t.n;

    if (escondido) {
      corpo.classList.add("pl-borrado");
      corpo.setAttribute("aria-hidden", "true");
      corpo.inert = true;
      corpo.querySelector(".pl-nome").removeAttribute("id");
      artigo.setAttribute(
        "aria-label",
        "Troféu nº " + t.n + " (spoiler da história)",
      );
      artigo.removeAttribute("aria-labelledby");
      artigo.append(
        el(
          "div",
          { class: "pl-spoiler" },
          corpo,
          el("button", {
            type: "button",
            class: "pl-revelar",
            text: "Spoiler: toque para ver",
            onclick: () => {
              revelados.add(t.n);
              const novo = trocarCartao(t);
              if (novo) novo.querySelector(".pl-nome").focus();
            },
          }),
        ),
      );
    } else {
      corpo.querySelector(".pl-nome").tabIndex = -1;
      artigo.append(corpo);
    }

    const acoes = el("div", { class: "pl-acoes" }, btn, linkMapa(t));
    if (t.gamerscore_xbox !== undefined && t.gamerscore_xbox !== null)
      acoes.append(
        el("span", {
          class: "pl-xbox",
          text: "Xbox: " + t.gamerscore_xbox + "G",
        }),
      );
    artigo.append(acoes);
    if (fontes.length)
      artigo.append(
        el(
          "details",
          { class: "pl-fontes" },
          el("summary", {
            text:
              "Fontes (" +
              fontes.length +
              ")" +
              (poucasFontes(t) ? " · " + texto(t.confianca) : ""),
          }),
          el("ul", null, fontes),
        ),
      );
    const li = el("li", { id: "trofeu-" + t.n, dataset: { n: t.n } }, artigo);
    return li;
  }

  function trocarCartao(t) {
    const velho = document.getElementById("trofeu-" + t.n);
    if (!velho) return null;
    const novo = cartao(t);
    velho.replaceWith(novo);
    if (!visivel(t)) novo.hidden = true;
    contarVisiveis();
    return novo;
  }

  function visivel(t) {
    if (filtro.tipo && t.tipo !== filtro.tipo) return false;
    if (filtro.soPerdiveis && !perdivel(t)) return false;
    const feito = salvo.conquistados.has(t.n);
    if (filtro.status === "conquistados" && !feito) return false;
    if (filtro.status === "faltando" && feito) return false;
    if (filtro.busca) {
      // spoiler escondido: a busca não olha o texto dele (não entrega o nome da missão)
      const mostrar = !t.spoiler || filtro.spoilers || revelados.has(t.n);
      const alvo = semAcento(
        mostrar
          ? [
              t.nome_original,
              t.nome_pt,
              t.descricao,
              t.como_conseguir,
              t.categoria,
              "#" + t.n,
            ].join(" ")
          : "#" + t.n + " historia",
      );
      if (!filtro.busca.split(/\s+/).every((b) => alvo.includes(b)))
        return false;
    }
    return true;
  }

  function contarVisiveis() {
    const n = trofeus.filter(visivel).length;
    $("#pl-mostrando").textContent =
      n === total
        ? "Mostrando os " + total + " troféus."
        : "Mostrando " + n + " de " + total + " troféus.";
    let vazio = $("#pl-vazio");
    if (!n && !vazio)
      $("#pl-trofeus").after(
        el("p", {
          id: "pl-vazio",
          class: "pl-vazio",
          text: "Nenhum troféu com esses filtros.",
        }),
      );
    else if (n && vazio) vazio.remove();
  }

  function desenharLista() {
    const lista = limpar($("#pl-trofeus"));
    for (const t of trofeus) {
      const li = cartao(t);
      li.hidden = !visivel(t);
      lista.append(li);
    }
    contarVisiveis();
  }

  // ---------- Filtros ----------
  $("#pl-filtros").addEventListener("submit", (ev) => ev.preventDefault());
  $("#pl-busca").addEventListener("input", (ev) => {
    filtro.busca = semAcento(ev.target.value.trim());
    aplicarFiltros();
  });
  $("#pl-tipo").addEventListener("change", (ev) => {
    filtro.tipo = TIPOS[ev.target.value] ? ev.target.value : "";
    aplicarFiltros();
  });
  $("#pl-status").addEventListener("change", (ev) => {
    filtro.status = ["faltando", "conquistados"].includes(ev.target.value)
      ? ev.target.value
      : "";
    aplicarFiltros();
  });
  $("#pl-so-perdiveis").addEventListener("click", (ev) => {
    filtro.soPerdiveis = !filtro.soPerdiveis;
    ev.currentTarget.setAttribute("aria-pressed", String(filtro.soPerdiveis));
    aplicarFiltros();
  });
  $("#pl-spoilers").addEventListener("click", (ev) => {
    filtro.spoilers = !filtro.spoilers;
    ev.currentTarget.setAttribute("aria-pressed", String(filtro.spoilers));
    ev.currentTarget.textContent = filtro.spoilers
      ? "Esconder spoilers"
      : "Mostrar todos os spoilers";
    if (!filtro.spoilers) revelados.clear();
    desenharLista();
  });
  function aplicarFiltros() {
    for (const t of trofeus) {
      const li = document.getElementById("trofeu-" + t.n);
      if (li) li.hidden = !visivel(t);
    }
    contarVisiveis();
  }

  // ---------- Cópia do progresso (outro aparelho / navegador) ----------
  $("#pl-exportar").addEventListener("click", () => {
    const conteudo = JSON.stringify(
      {
        app: "platina-gta6",
        versao: 1,
        salvo_em: new Date().toISOString(),
        conquistados: [...salvo.conquistados].sort((a, b) => a - b),
        lista100: [...salvo.lista100].sort((a, b) => a - b),
      },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([conteudo], { type: "application/json" }),
    );
    const a = el("a", { download: "platina-gta6-progresso.json" });
    a.setAttribute("href", url);
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    aviso("Cópia baixada. Guarde o arquivo para restaurar em outro aparelho.");
  });
  $("#pl-importar").addEventListener("change", async (ev) => {
    const arq = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!arq) return;
    try {
      if (arq.size > 20000) throw new Error("grande");
      const d = JSON.parse(await arq.text());
      if (!d || d.app !== "platina-gta6") throw new Error("outro arquivo");
      salvo.conquistados = new Set(
        numerosValidos(d.conquistados, 999).filter((n) =>
          trofeus.some((t) => t.n === n),
        ),
      );
      salvo.lista100 = new Set(numerosValidos(d.lista100, 99));
      gravar();
      atualizarProgresso();
      desenharLista();
      document
        .querySelectorAll("#pl-checklist input")
        .forEach((c, i) => (c.checked = salvo.lista100.has(i + 1)));
      aviso("Progresso restaurado: " + salvo.conquistados.size + " troféu(s).");
    } catch (e) {
      aviso("Esse arquivo não é uma cópia do progresso da platina.", "erro");
    }
  });

  // ---------- Notas e fontes gerais ----------
  $("#pl-nota-texto").textContent =
    "Pesquisa de " +
    texto(dados.gerado_em || "22/11/2026")
      .split("-")
      .reverse()
      .join("/") +
    ", poucos dias depois do lançamento, em guias de troféus (lista dos 55 igual em 5 sites). " +
    "Ainda não existem nomes oficiais em português: o nome grande é o original (o que aparece no PS5) e a tradução é nossa. " +
    "“Poucas fontes” = só 1 ou 2 guias confirmam o jeito de pegar. Achou algo diferente no jogo? Avise no Discord da live.";
  const fg = $("#pl-fontes-gerais");
  for (const f of Array.isArray(dados.fontes_gerais)
    ? dados.fontes_gerais
    : []) {
    const a = el("a", {
      href: f,
      target: "_blank",
      rel: "noopener noreferrer",
      text: host(f) || "fonte",
    });
    if (a.hasAttribute("href")) fg.append(el("li", null, a));
  }

  atualizarProgresso();
  desenharLista();
  // link direto para um troféu (#trofeu-28)
  if (/^#trofeu-\d{1,3}$/.test(location.hash)) {
    const alvo = document.getElementById(location.hash.slice(1));
    if (alvo) alvo.scrollIntoView();
  }
  document.documentElement.dataset.pronto = "1";
})();
