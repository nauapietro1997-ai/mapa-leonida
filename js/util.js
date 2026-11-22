// Ferramentas comuns a todas as páginas. Regra: texto de usuário entra SEMPRE como
// textContent (nunca innerHTML), links só https, imagens só de origens conhecidas.
(function () {
  "use strict";

  // Página dentro de um iframe de outro site (golpe de "clique escondido"): não mostra nada.
  if (window.top !== window.self) {
    document.documentElement.classList.add("emoldurado");
    try {
      window.top.location = window.self.location.href;
    } catch (e) {
      /* o navegador bloqueou; a página fica escondida pelo CSS */
    }
  }

  const CATEGORIAS = {
    armas: { nome: "Armas", icone: "🔫", cor: "#ff2e88" },
    dinheiro: { nome: "Dinheiro", icone: "💵", cor: "#31e7ff" },
    "easter-eggs": { nome: "Easter eggs", icone: "🥚", cor: "#ffb347" },
    misterios: { nome: "Mistérios", icone: "👽", cor: "#c13cff" },
    veiculos: { nome: "Veículos", icone: "🚗", cor: "#ffd3ea" },
    lojas: { nome: "Lojas", icone: "🛒", cor: "#ff7a2f" },
    colecionaveis: { nome: "Colecionáveis", icone: "⭐", cor: "#fff36b" },
  };

  // Tipos de veículo com ícone próprio (coluna "subtipo" dos pontos).
  const SUBTIPOS = {
    carro: "🚗",
    moto: "🏍️",
    barco: "🚤",
    aviao: "✈️",
    helicoptero: "🚁",
  };

  // Ícone da categoria: imagem gerada (assets/icones/<nome>.png). Se o arquivo
  // não existir, troca sozinho pelo emoji (o pino continua funcionando).
  const iconesFaltando = new Set(); // não pede de novo um arquivo que já deu erro
  function iconeCategoria(categoria, subtipo, classe) {
    const cat = CATEGORIAS[categoria] || CATEGORIAS.misterios;
    const nome =
      categoria === "veiculos" && SUBTIPOS[subtipo] && subtipo !== "carro"
        ? subtipo
        : CATEGORIAS[categoria]
          ? categoria
          : "misterios";
    const emoji =
      categoria === "veiculos" && SUBTIPOS[subtipo]
        ? SUBTIPOS[subtipo]
        : cat.icone;
    const caixa = el("span", {
      class: (classe || "ic") + " ic-carregando",
      "aria-hidden": "true",
    });
    if (iconesFaltando.has(nome)) {
      caixa.className = (classe || "ic") + " ic-emoji";
      caixa.textContent = emoji;
      return caixa;
    }
    const img = el("img", {
      src: "assets/icones/" + nome + ".png",
      alt: "",
      width: 64,
      height: 64,
      decoding: "async",
      draggable: "false",
    });
    img.addEventListener("load", () => caixa.classList.remove("ic-carregando"));
    img.addEventListener("error", () => {
      iconesFaltando.add(nome);
      caixa.classList.remove("ic-carregando");
      caixa.classList.add("ic-emoji");
      img.replaceWith(document.createTextNode(emoji));
    });
    caixa.append(img);
    return caixa;
  }

  // Links dos canais (config.js > CANAIS). Endereço vazio = não aparece.
  function canais() {
    return (window.CONFIG.CANAIS || [])
      .map((c) => ({ ...c, url: linkSeguro(c.url || "") }))
      .filter((c) => c.url)
      .map((c) =>
        el(
          "a",
          {
            class: "canal",
            href: c.url,
            target: "_blank",
            rel: "noopener noreferrer me",
          },
          c.nome,
        ),
      );
  }

  // Cria um elemento. Filhos em texto viram nós de texto (nunca HTML).
  // el("p", { class: "x", text: "oi" }, filho1, "texto", ...)
  function el(tag, props, ...filhos) {
    const n = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = String(v);
        else if (k === "dataset") Object.assign(n.dataset, v);
        else if (k === "cor") n.style.setProperty("--cor", v);
        else if (k.startsWith("on") && typeof v === "function")
          n.addEventListener(k.slice(2), v);
        else if (k === "href") {
          const u = linkSeguro(v, true);
          if (u) n.setAttribute("href", u);
        } else if (k === "src") {
          const u = imagemSegura(v);
          if (u) n.setAttribute("src", u);
        } else if (v === true) n.setAttribute(k, "");
        else n.setAttribute(k, String(v));
      }
    }
    for (const f of filhos.flat()) {
      if (f === null || f === undefined || f === false) continue;
      n.append(f instanceof Node ? f : document.createTextNode(String(f)));
    }
    return n;
  }

  function limpar(n) {
    while (n.firstChild) n.removeChild(n.firstChild);
    return n;
  }

  // Link externo: só https (ou caminho do próprio site quando permitido).
  function linkSeguro(s, permitirLocal) {
    if (typeof s !== "string" || s.length > 500) return null;
    if (permitirLocal && /^[a-z0-9-]+\.html(#[a-z0-9-]*)?$/i.test(s)) return s;
    if (permitirLocal && /^#[a-z0-9-]*$/i.test(s)) return s;
    try {
      const u = new URL(s);
      if (u.protocol !== "https:" || u.username || u.password) return null;
      return u.href;
    } catch (e) {
      return null;
    }
  }

  // Imagem: arquivo do site (img/...), blob: (pré-visualização), avatar do Discord
  // ou arquivo do Storage do Supabase configurado. O resto é recusado.
  function imagemSegura(s) {
    if (typeof s !== "string") return null;
    // pré-visualização local (blob:) ou imagem embutida de tipo simples (nunca SVG)
    if (
      s.startsWith("blob:") ||
      /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s)
    )
      return s;
    if (s.length > 2000) return null;
    if (/^assets\/(icones|marca)\/[a-z0-9-]+\.png$/.test(s)) return s;
    if (
      /^img\/[A-Za-z0-9/_.-]+\.(webp|jpe?g|png)$/.test(s) &&
      !s.includes("..")
    )
      return s;
    try {
      const u = new URL(s);
      if (u.protocol !== "https:") return null;
      if (u.hostname === "cdn.discordapp.com") return u.href;
      const base = new URL(window.CONFIG.SUPABASE_URL);
      if (
        u.hostname === base.hostname &&
        u.pathname.startsWith("/storage/v1/object/")
      )
        return u.href;
    } catch (e) {
      /* inválida */
    }
    return null;
  }

  function host(s) {
    try {
      return new URL(s).hostname.replace(/^www\./, "");
    } catch (e) {
      return "";
    }
  }

  function dinheiro(n) {
    if (n === null || n === undefined || n === "") return "";
    return "US$ " + Math.round(Number(n)).toLocaleString("pt-BR");
  }

  function data(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function semAcento(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  let timerAviso = null;
  function aviso(msg, tipo) {
    let t = document.getElementById("toast");
    if (!t) {
      t = el("div", {
        id: "toast",
        class: "toast",
        role: "status",
        "aria-live": "polite",
      });
      document.body.append(t);
    }
    t.textContent = msg;
    t.classList.toggle("toast-erro", tipo === "erro");
    t.classList.add("visivel");
    clearTimeout(timerAviso);
    timerAviso = setTimeout(
      () => t.classList.remove("visivel"),
      tipo === "erro" ? 6000 : 3500,
    );
  }

  // Mensagem de erro amigável (sem detalhes técnicos do banco).
  function textoErro(e) {
    const m = (e && (e.message || e.error_description || e.msg)) || "";
    if (/limite/i.test(m)) return m;
    if (/permiss|permission|42501|row-level|RLS/i.test(m))
      return "Você não tem permissão para isso.";
    if (/network|fetch|Failed to fetch/i.test(m))
      return "Sem conexão. Tente de novo.";
    if (m && m.length < 140 && !/[{}<>]/.test(m)) return m;
    return "Algo deu errado. Tente de novo.";
  }

  // Abre um <dialog> e devolve uma Promise com o resultado.
  function perguntar({
    titulo,
    texto,
    campo,
    rotuloCampo,
    confirmar,
    perigo,
    minimo,
  }) {
    return new Promise((resolve) => {
      const area = campo
        ? el("textarea", {
            id: "pergunta-campo",
            rows: 3,
            maxlength: 500,
            required: true,
          })
        : null;
      const erro = el("p", { class: "campo-erro", hidden: true });
      const dlg = el(
        "dialog",
        { class: "dialogo" },
        el(
          "form",
          { method: "dialog", class: "dialogo-corpo" },
          el("h2", { class: "dialogo-titulo", text: titulo }),
          texto ? el("p", { class: "dialogo-texto", text: texto }) : null,
          area
            ? el(
                "label",
                { class: "campo", for: "pergunta-campo" },
                el("span", { text: rotuloCampo || "Motivo" }),
                area,
              )
            : null,
          erro,
          el(
            "div",
            { class: "dialogo-acoes" },
            el("button", {
              type: "button",
              class: "btn btn-fantasma",
              value: "nao",
              text: "Cancelar",
              onclick: () => dlg.close("nao"),
            }),
            el("button", {
              type: "submit",
              class: "btn " + (perigo ? "btn-perigo" : "btn-primario"),
              value: "sim",
              text: confirmar || "Confirmar",
            }),
          ),
        ),
      );
      dlg.querySelector("form").addEventListener("submit", (ev) => {
        if (area && area.value.trim().length < (minimo || 3)) {
          ev.preventDefault();
          erro.hidden = false;
          erro.textContent = "Escreva pelo menos " + (minimo || 3) + " letras.";
          area.focus();
        }
      });
      dlg.addEventListener("close", () => {
        const ok = dlg.returnValue === "sim";
        resolve(ok ? (area ? area.value.trim() : true) : null);
        dlg.remove();
      });
      document.body.append(dlg);
      dlg.showModal();
      (area || dlg.querySelector(".btn-fantasma")).focus();
    });
  }

  window.U = {
    CATEGORIAS,
    SUBTIPOS,
    iconeCategoria,
    canais,
    paginas,
    el,
    limpar,
    linkSeguro,
    imagemSegura,
    host,
    dinheiro,
    data,
    semAcento,
    aviso,
    textoErro,
    perguntar,
  };

  // Menu de páginas (config.js > PAGINAS). Página nova = uma linha no config.
  function paginas() {
    const atual = (
      location.pathname.split("/").pop() || "index.html"
    ).toLowerCase();
    return (window.CONFIG.PAGINAS || [])
      .filter((p) => p && /^[a-z0-9-]+\.html$/i.test(p.url || ""))
      .map((p) =>
        el(
          "a",
          {
            class: "nav-pagina",
            href: p.url,
            "aria-current": p.url.toLowerCase() === atual ? "page" : null,
          },
          p.nome,
        ),
      );
  }
  document.querySelectorAll("[data-paginas]").forEach((caixa) => {
    const links = paginas();
    if (links.length) caixa.append(...links);
    else caixa.hidden = true;
  });

  // Preenche os lugares marcados com data-canais (topo e rodapé).
  document.querySelectorAll("[data-canais]").forEach((caixa) => {
    const links = canais();
    if (links.length) caixa.append(...links);
    else caixa.hidden = true;
  });
})();
