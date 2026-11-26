// Página "Como platinar GTA 6": lista dos 55 troféus (dados/trofeus.json, arquivo estático),
// progresso de cada visitante salvo SÓ no navegador dele (localStorage), filtros e spoilers.
// Seções: capa com placar, troféus perdíveis (+ "Atenção"), roteiro com os pontos sem volta
// (faça um save antes), lista com filtros. Aceita campos faltando no JSON.
// Regra do site: todo texto entra com textContent (função el()), links só https.
(async function () {
  "use strict";
  const { el, limpar, semAcento, aviso, host } = window.U;
  const $ = (s) => document.querySelector(s);
  const menosMovimento = () =>
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const TIPOS = {
    platina: { nome: "Platina", ordem: 0 },
    ouro: { nome: "Ouro", ordem: 1 },
    prata: { nome: "Prata", ordem: 2 },
    bronze: { nome: "Bronze", ordem: 3 },
  };
  const CHAVE = "platina-gta6-v1";

  // ---------- Abertura "trailer" (js/abertura-platina.js liga html.pl-abrindo) ----------
  // O que depende da capa aparecer (placar, troféus ao rolar) espera o fim dos cartões.
  const raiz = document.documentElement;
  const abrindo = () =>
    raiz.classList.contains("pl-abrindo") &&
    !raiz.classList.contains("pl-abertura-fim");
  function depoisDaAbertura(fn) {
    if (abrindo())
      document.addEventListener("pl:abertura-fim", () => fn(), { once: true });
    else fn();
  }

  // ---------- Capa: sem o arquivo da arte, fica só cor e tipografia ----------
  const hero = $("#pl-hero");
  const capa = $("#pl-capa-img");
  if (capa) {
    const semCapa = () => {
      hero.classList.add("sem-capa");
      capa.remove();
    };
    if (capa.complete && !capa.naturalWidth) semCapa();
    else capa.addEventListener("error", semCapa, { once: true });
  }

  // ---------- Capa viva: vídeo em loop por cima da arte (Flow/Veo, sem som) ----------
  // A imagem parada continua embaixo: enquanto o vídeo carrega, se ele falhar,
  // com "menos movimento" ou com economia de dados, fica só a imagem.
  // Celular recebe a versão menor. Pausa fora da tela e com a aba escondida.
  (function capaViva() {
    const caixa = document.querySelector(".pl-capa");
    if (!caixa || !capa || !capa.isConnected) return;
    const menosMov = matchMedia("(prefers-reduced-motion: reduce)");
    const economia = navigator.connection && navigator.connection.saveData;
    if (menosMov.matches || economia) return;
    const celular = matchMedia("(max-width: 900px)").matches;
    const v = document.createElement("video");
    v.className = "pl-capa-img pl-capa-video";
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("aria-hidden", "true");
    v.setAttribute("tabindex", "-1");
    v.disablePictureInPicture = true;
    v.preload = "auto";
    v.src = celular ? "img/platina-capa-cel.mp4" : "img/platina-capa-pc.mp4";
    let naTela = true;
    const tocar = () => {
      if (naTela && !document.hidden && !menosMov.matches) {
        const p = v.play();
        if (p && p.catch) p.catch(() => {});
      }
    };
    v.addEventListener("playing", () => v.classList.add("tocando"), {
      once: true,
    });
    v.addEventListener("error", () => v.remove(), { once: true });
    v.addEventListener("canplay", tocar, { once: true });
    caixa.insertBefore(v, capa.nextSibling);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((ent) => {
        naTela = ent[0].isIntersecting;
        if (naTela) tocar();
        else v.pause();
      }).observe(caixa);
    }
    document.addEventListener("visibilitychange", () =>
      document.hidden ? v.pause() : tocar(),
    );
    menosMov.addEventListener("change", () => {
      if (menosMov.matches) v.remove();
    });
  })();

  // filtros grudam embaixo do topo (no PC): altura real do topo
  const topo = document.querySelector(".topo");
  const platina = document.querySelector(".platina");
  if (topo && platina && "ResizeObserver" in window)
    new ResizeObserver(() =>
      platina.style.setProperty("--pl-topo", topo.offsetHeight + "px"),
    ).observe(topo);

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
  const texto = (v) =>
    typeof v === "string" ? v : v === null || v === undefined ? "" : String(v);
  const perdivel = (t) => !!(t.perdivel && t.perdivel.perdivel);
  const poucasFontes = (t) => !/^confirmado/i.test(String(t.confianca || ""));
  const listaUrls = (v) =>
    (Array.isArray(v) ? v : [])
      .map((f) => (f && typeof f === "object" ? f.url : f))
      .map((f) => texto(f).trim().split(/\s/)[0])
      .filter((f) => /^https:\/\//i.test(f));

  // grau de certeza: confirmado / provavel / boato
  function certeza(valor, t) {
    const s = semAcento(texto(valor));
    if (/boato|rumor|nao confirm/.test(s)) return "boato";
    if (/prov|possiv/.test(s)) return "provavel";
    if (/confirm/.test(s)) return "confirmado";
    if (t && /^possivelmente/i.test(texto(t.perdivel && t.perdivel.motivo)))
      return "provavel";
    return t && poucasFontes(t) ? "provavel" : "confirmado";
  }
  const NOME_CERTEZA = {
    confirmado: "Confirmado",
    provavel: "Provável",
    boato: "Boato",
  };
  function seloCerteza(c) {
    return el(
      "span",
      { class: "pl-certeza pl-certeza-" + c },
      el("span", { class: "sr", text: "Certeza: " }),
      NOME_CERTEZA[c],
    );
  }
  // texto do "Atenção" (quase perdível): no troféu ou dentro de perdivel
  function atencaoDe(t) {
    const a =
      t.atencao !== undefined ? t.atencao : t.perdivel && t.perdivel.atencao;
    if (!a) return null;
    if (typeof a === "string") return { texto: a };
    if (typeof a === "object")
      return {
        texto: texto(a.texto || a.motivo || a.aviso),
        ate_quando: texto(a.ate_quando),
        como_evitar: texto(a.como_evitar),
      };
    return null;
  }
  // nome visível sem entregar spoiler da história
  const nomeSeguro = (t) =>
    t.spoiler ? "Troféu de história nº " + t.n : t.nome_original;
  function linkFonte(f) {
    return el("a", {
      href: f,
      target: "_blank",
      rel: "noopener noreferrer",
      text: host(f) || "fonte",
    });
  }
  function botaoIrPara(t, rotulo) {
    return el("a", {
      class: "pl-ir",
      href: "#trofeu-" + t.n,
      text: rotulo || "Ver troféu",
    });
  }

  // ---------- Resumo no pé da capa (faixa de créditos) ----------
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

  // ---------- Troféus perdíveis ----------
  const pontosSemVolta = (
    Array.isArray(roteiro.pontos_sem_volta) ? roteiro.pontos_sem_volta : []
  ).filter((p) => p && (p.aviso || p.quando));
  const avisoSempre = pontosSemVolta.find((p) =>
    /^sempre/i.test(texto(p.quando)),
  );
  const saves = /(\d+)\s*vagas?\s*manua\w*\s*\+\s*(\d+)\s*autom/i.exec(
    texto(avisoSempre && avisoSempre.aviso),
  );
  const regras = [];
  if (roteiro.replay_de_missao === false)
    regras.push(["Sem replay de missão", ""]);
  regras.push([
    saves
      ? saves[1] + " saves manuais + " + saves[2] + " automático"
      : "15 saves manuais + 1 automático",
    "",
  ]);
  if (roteiro.free_roam_pos_historia !== false)
    regras.push(["Depois dos créditos, o mundo livre continua", ""]);
  const caixaRegras = $("#pl-regras");
  for (const [r] of regras) caixaRegras.append(el("li", { text: r }));

  const listaPerd = $("#pl-perd-lista");
  const perdiveis = trofeus.filter(perdivel);
  for (const t of perdiveis) {
    const p = t.perdivel;
    const c = certeza(p.certeza, t);
    const fatosP = [
      ["Até quando", texto(p.ate_quando) || "Não se sabe ainda."],
      [
        "Como evitar",
        texto(p.como_evitar) ||
          (p.ate_quando
            ? "Faça " + texto(p.ate_quando) + "."
            : "Faça assim que aparecer."),
      ],
      ["Dá para recuperar?", texto(p.recuperavel) || "Não se sabe ainda."],
    ];
    const fontesP = listaUrls(p.fontes).length
      ? listaUrls(p.fontes)
      : listaUrls(t.fontes);
    listaPerd.append(
      el(
        "li",
        { class: "pl-perd-item pl-t-" + t.tipo },
        el(
          "div",
          { class: "pl-perd-topo" },
          seloCerteza(c),
          el("span", {
            class: "pl-perd-meta",
            text: TIPOS[t.tipo].nome + " · nº " + t.n,
          }),
        ),
        el("h3", { class: "pl-perd-nome", text: nomeSeguro(t) }),
        t.spoiler
          ? null
          : el("p", { class: "pl-perd-pt", text: texto(t.nome_pt) }),
        el("p", {
          class: "pl-perd-motivo",
          text: texto(p.motivo).replace(/^Possivelmente perdível:\s*/i, ""),
        }),
        el(
          "dl",
          { class: "pl-perd-fatos" },
          ...fatosP.map(([dt, dd]) =>
            el("div", null, el("dt", { text: dt }), el("dd", { text: dd })),
          ),
        ),
        el(
          "div",
          { class: "pl-perd-acoes" },
          botaoIrPara(t, "Ver na lista"),
          fontesP.length
            ? el(
                "details",
                { class: "pl-fontes" },
                el("summary", { text: "Fontes (" + fontesP.length + ")" }),
                el(
                  "ul",
                  null,
                  fontesP.map((f) => el("li", null, linkFonte(f))),
                ),
              )
            : null,
        ),
      ),
    );
  }
  if (!perdiveis.length)
    listaPerd.append(
      el("li", {
        class: "pl-vazio-perd",
        text: "Nenhum troféu perdível confirmado até agora.",
      }),
    );
  // números dos cartões da abertura vêm dos dados (se ela ainda está na tela)
  const abTotal = $("#pl-ab-total");
  if (abTotal) {
    abTotal.textContent = String(total);
    $("#pl-ab-perd").textContent = String(perdiveis.length);
    $("#pl-ab-perd-palavra").textContent =
      perdiveis.length === 1 ? "perdível" : "perdíveis";
  }
  $("#pl-perd-lead").textContent = perdiveis.length
    ? perdiveis.length === 1
      ? "Só 1 troféu pode ser perdido. Passou do ponto, só jogando tudo de novo."
      : perdiveis.length +
        " troféus podem ser perdidos. Passou do ponto, só jogando tudo de novo."
    : "Nenhum troféu perdível até agora. Mesmo assim, leia os avisos abaixo.";

  // Atenção (quase perdíveis): não perdem o troféu, mas é bom não deixar para depois
  const comAtencao = trofeus.filter((t) => atencaoDe(t));
  if (comAtencao.length) {
    const ul = $("#pl-atencao-lista");
    for (const t of comAtencao) {
      const a = atencaoDe(t);
      ul.append(
        el(
          "li",
          { class: "pl-t-" + t.tipo },
          el("p", { class: "pl-atencao-nome", text: nomeSeguro(t) }),
          el("p", {
            class: "pl-atencao-meta",
            text: TIPOS[t.tipo].nome + " · nº " + t.n,
          }),
          el("p", { class: "pl-atencao-texto", text: a.texto }),
          a.ate_quando
            ? el("p", {
                class: "pl-atencao-texto",
                text: "Até quando: " + a.ate_quando,
              })
            : null,
          botaoIrPara(t),
        ),
      );
    }
    $("#pl-atencao-bloco").hidden = false;
  }

  // ---------- Antes de começar ----------
  const alerta = $("#pl-alerta-lista");
  for (const t of perdiveis)
    alerta.append(
      el(
        "li",
        { class: "pl-alerta-perdivel" },
        el("span", { class: "pl-selo pl-selo-perdivel", text: "Perdível" }),
        " ",
        el("strong", { text: nomeSeguro(t) }),
        certeza(t.perdivel.certeza, t) === "confirmado"
          ? ""
          : " (não confirmado)",
        t.perdivel.ate_quando
          ? ": faça " + texto(t.perdivel.ate_quando) + ". "
          : ". ",
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
    ),
  );
  const fontesPerd = listaUrls(roteiro.fontes_perdiveis);
  if (fontesPerd.length) {
    const ul = $("#pl-perd-fontes-lista");
    for (const f of fontesPerd) ul.append(el("li", null, linkFonte(f)));
    $("#pl-perd-fontes").hidden = false;
  }

  // ---------- Roteiro (com os pontos sem volta: faça um save antes) ----------
  if (avisoSempre) {
    const s = $("#pl-sempre");
    s.append(el("strong", { text: "Sempre" }), texto(avisoSempre.aviso));
    s.hidden = false;
  }
  const etapasDados = Array.isArray(roteiro.etapas) ? roteiro.etapas : [];
  // cada ponto sem volta vai para a etapa dele (campo "etapa") ou para a da história (1ª)
  const savesPorEtapa = new Map();
  for (const p of pontosSemVolta) {
    if (p === avisoSempre) continue;
    const alvo = Number.isInteger(p.etapa)
      ? p.etapa
      : etapasDados.length
        ? etapasDados[0].etapa
        : 1;
    if (!savesPorEtapa.has(alvo)) savesPorEtapa.set(alvo, []);
    savesPorEtapa.get(alvo).push(p);
  }
  const etapas = $("#pl-etapas");
  for (const e of etapasDados) {
    const lista = savesPorEtapa.get(e.etapa) || [];
    const extras = (
      Array.isArray(e.save_antes)
        ? e.save_antes
        : e.save_antes
          ? [e.save_antes]
          : []
    ).map((s) => (typeof s === "string" ? { aviso: s } : s));
    const todos = [...lista, ...extras];
    etapas.append(
      el(
        "li",
        { class: "pl-etapa" },
        el(
          "p",
          { class: "pl-etapa-num" },
          el("span", { text: "Etapa" }),
          texto(e.etapa),
        ),
        el(
          "div",
          { class: "pl-etapa-corpo" },
          el(
            "div",
            { class: "pl-etapa-cab" },
            el("h3", { class: "pl-h3", text: texto(e.nome) }),
            e.horas
              ? el("p", {
                  class: "pl-etapa-horas",
                  text: texto(e.horas) + " h",
                })
              : null,
          ),
          el("p", { class: "pl-etapa-texto", text: texto(e.o_que) }),
          todos.length
            ? el(
                "ul",
                { class: "pl-saves", "aria-label": "Faça um save antes" },
                todos.map((p) =>
                  el(
                    "li",
                    { class: "pl-save" },
                    el("span", {
                      class: "pl-save-rotulo",
                      text: "Salve antes",
                    }),
                    el("p", {
                      class: "pl-save-quando",
                      text: texto(p.quando) || "Neste ponto",
                    }),
                    el("p", { class: "pl-save-texto", text: texto(p.aviso) }),
                  ),
                ),
              )
            : null,
        ),
      ),
    );
  }

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

  // ---------- Placar (número grande conta até o valor novo) ----------
  const placarFeitos = $("#pl-placar-feitos");
  const trilho = $("#pl-trilho-cheio");
  let placarAtual = 0;
  let placarQuadro = 0;
  function contarAte(alvo, demora) {
    cancelAnimationFrame(placarQuadro);
    const de = placarAtual;
    if (menosMovimento() || de === alvo) {
      placarAtual = alvo;
      placarFeitos.textContent = String(alvo);
      return;
    }
    const duracao = Math.min(900, 380 + Math.abs(alvo - de) * 25);
    let inicio = 0;
    const passo = (agora) => {
      if (!inicio) inicio = agora + (demora || 0);
      const p = Math.max(0, Math.min(1, (agora - inicio) / duracao));
      const suave = 1 - Math.pow(1 - p, 3);
      placarAtual = Math.round(de + (alvo - de) * suave);
      placarFeitos.textContent = String(placarAtual);
      if (p < 1) placarQuadro = requestAnimationFrame(passo);
    };
    placarQuadro = requestAnimationFrame(passo);
  }

  function atualizarProgresso(primeiraVez) {
    const feitos = trofeus.filter((t) => salvo.conquistados.has(t.n)).length;
    const pct = total ? Math.round((feitos / total) * 100) : 0;
    $("#pl-prog-num").textContent = feitos + " de " + total + " · " + pct + "%";
    $("#pl-placar-total").textContent = "/" + total;
    const barra = $("#pl-barra");
    barra.max = total;
    barra.value = feitos;
    barra.setAttribute("aria-valuetext", feitos + " de " + total + " troféus");
    const encher = () => {
      const agora = trofeus.filter((t) => salvo.conquistados.has(t.n)).length;
      trilho.style.transform = "scaleX(" + (total ? agora / total : 0) + ")";
      return agora;
    };
    if (primeiraVez)
      // espera a capa aparecer (e a abertura acabar) para a barra encher junto com o número
      depoisDaAbertura(() => {
        if (menosMovimento()) contarAte(encher(), 0);
        else
          setTimeout(() => {
            encher();
            contarAte(
              trofeus.filter((t) => salvo.conquistados.has(t.n)).length,
            );
          }, 450);
      });
    else contarAte(encher(), 0);
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

  // ---------- Troféus (e títulos) aparecem um a um ao rolar ----------
  // html.pl-revela esconde o que ainda não entrou na tela; ao entrar ganha pl-visto
  // (CSS faz subir + aparecer). Não liga sem IntersectionObserver nem com link #trofeu-N.
  // O 1º uso de filtro/busca desliga tudo (lista aparece na hora).
  const vistos = new Set(); // nº dos troféus já revelados (a lista é redesenhada às vezes)
  const revela = revelarAoRolar();
  function revelarAoRolar() {
    if (!("IntersectionObserver" in window) || /^#trofeu-/.test(location.hash))
      return null;
    raiz.classList.add("pl-revela");
    const ativo = () => raiz.classList.contains("pl-revela");
    const celular = () => window.matchMedia("(max-width: 900px)").matches;
    const fila = []; // observados só depois da abertura (atrás da película não adianta)
    let io = null;
    function mostrar(alvo, atraso) {
      alvo.style.setProperty("--pl-d", atraso + "ms");
      alvo.classList.add("pl-visto");
      if (alvo.dataset.n) vistos.add(Number(alvo.dataset.n));
      io.unobserve(alvo);
    }
    depoisDaAbertura(() => {
      if (!ativo()) return;
      io = new IntersectionObserver(
        (entradas) => {
          const passo = celular() ? 45 : 70;
          let i = 0;
          for (const e of entradas) {
            if (e.isIntersecting) mostrar(e.target, Math.min(i++, 5) * passo);
            // já ficou para trás (página aberta rolada): aparece sem efeito
            else if (e.boundingClientRect.bottom < 0) mostrar(e.target, 0);
          }
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
      );
      fila.splice(0).forEach((a) => io.observe(a));
    });
    return {
      ativo,
      observar(alvo) {
        if (!ativo()) return;
        if (io) io.observe(alvo);
        else fila.push(alvo);
      },
      esquecer(alvo) {
        if (io) io.unobserve(alvo);
        const i = fila.indexOf(alvo);
        if (i >= 0) fila.splice(i, 1);
      },
      desligar() {
        raiz.classList.remove("pl-revela");
        if (io) io.disconnect();
        fila.length = 0;
      },
    };
  }
  // cartão novo da lista: já visto (ou trocado no lugar) nasce visível; senão espera a vez
  function prepararRevela(li, n, trocado) {
    if (!revela || !revela.ativo()) return;
    if (trocado || vistos.has(n)) {
      li.classList.add("pl-visto");
      vistos.add(n);
    } else revela.observar(li);
  }
  if (revela)
    document.querySelectorAll(".pl-h2").forEach((h) => revela.observar(h));

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

  function cartao(t, opcoes) {
    const feito = salvo.conquistados.has(t.n);
    const escondido = t.spoiler && !filtro.spoilers && !revelados.has(t.n);
    const selos = el(
      "div",
      { class: "pl-selos" },
      el("span", { class: "pl-tipo", text: TIPOS[t.tipo].nome }),
    );
    if (perdivel(t))
      selos.append(
        el("span", {
          class: "pl-selo pl-selo-perdivel",
          text: "Perdível",
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
        el(
          "p",
          { class: "pl-perdivel-texto" },
          el("strong", {
            text:
              "Perdível" +
              (t.perdivel.ate_quando
                ? ": faça " + texto(t.perdivel.ate_quando)
                : ""),
          }),
          texto(t.perdivel.motivo).replace(/^Possivelmente perdível:\s*/i, ""),
        ),
      );
    const at = atencaoDe(t);
    if (at && at.texto)
      corpo.append(
        el(
          "p",
          { class: "pl-atencao-texto-cartao" },
          el("strong", { text: "Atenção" }),
          at.texto,
        ),
      );

    const fontes = listaUrls(t.fontes).map((f) => el("li", null, linkFonte(f)));

    const btn = el("button", {
      type: "button",
      class: "pl-conquistei",
      "aria-pressed": String(feito),
      "aria-label":
        (feito ? "Conquistado: " : "Marcar como conquistado: ") +
        (escondido ? "troféu de história nº " + t.n : t.nome_original),
      text: feito ? "Conquistado" : "Conquistei",
      onclick: () => {
        const agora = !salvo.conquistados.has(t.n);
        agora ? salvo.conquistados.add(t.n) : salvo.conquistados.delete(t.n);
        gravar();
        atualizarProgresso();
        const novo = trocarCartao(t, { carimbar: agora });
        const b = novo && novo.querySelector(".pl-conquistei");
        if (b) b.focus();
      },
    });

    const artigo = el(
      "article",
      {
        class:
          "pl-trofeu pl-t-" +
          t.tipo +
          (feito ? " feito" : "") +
          (perdivel(t) ? " perdivel" : ""),
        "aria-labelledby": "pl-nome-" + t.n,
      },
      el(
        "div",
        { class: "pl-cabeca" },
        el("span", { class: "pl-num", text: "nº " + t.n }),
        selos,
      ),
    );
    if (feito)
      artigo.append(
        el("span", {
          class:
            "pl-carimbo" +
            (opcoes && opcoes.carimbar ? " pl-carimbo-novo" : ""),
          "aria-hidden": "true",
          text: "Conquistado",
        }),
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
              const novo = trocarCartao(t, { revelado: true });
              if (novo) novo.querySelector(".pl-nome").focus();
            },
          }),
        ),
      );
    } else {
      if (opcoes && opcoes.revelado) corpo.classList.add("pl-revelado");
      corpo.querySelector(".pl-nome").tabIndex = -1;
      artigo.append(corpo);
    }

    const acoes = el("div", { class: "pl-acoes" }, btn, linkMapa(t));
    if (t.gamerscore_xbox !== undefined && t.gamerscore_xbox !== null)
      acoes.append(
        el("span", {
          class: "pl-xbox",
          text: "Xbox " + t.gamerscore_xbox + "G",
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
    const li = el(
      "li",
      {
        id: "trofeu-" + t.n,
        class: t.tipo === "platina" ? "pl-li-platina" : null,
        dataset: { n: t.n },
      },
      artigo,
    );
    prepararRevela(li, t.n, opcoes && opcoes.trocado);
    return li;
  }

  function trocarCartao(t, opcoes) {
    const velho = document.getElementById("trofeu-" + t.n);
    if (!velho) return null;
    if (revela) revela.esquecer(velho);
    const novo = cartao(t, Object.assign({}, opcoes, { trocado: true }));
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
          text: "Nenhum troféu com esses filtros. Limpe a busca ou troque o tipo.",
        }),
      );
    else if (n && vazio) vazio.remove();
  }

  function desenharLista() {
    if (revela)
      for (const velho of $("#pl-trofeus").children) revela.esquecer(velho);
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
    // quem filtra quer ver o resultado na hora: desliga o "aparecer ao rolar"
    if (revela && revela.ativo()) revela.desligar();
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
  for (const f of listaUrls(dados.fontes_gerais))
    fg.append(el("li", null, linkFonte(f)));

  atualizarProgresso(true);
  desenharLista();
  // link direto para um troféu (#trofeu-28)
  if (/^#trofeu-\d{1,3}$/.test(location.hash)) {
    const alvo = document.getElementById(location.hash.slice(1));
    if (alvo) alvo.scrollIntoView();
  }
  document.documentElement.dataset.pronto = "1";
})();
