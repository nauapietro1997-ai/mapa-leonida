// Página do mapa público: pontos aprovados, detalhes, sugerir lugar, minhas sugestões, ofertas.
(async function () {
  "use strict";
  const {
    CATEGORIAS,
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
  } = window.U;
  const { criarMapa, iconePino, iconeNovo, paraLatLng, deLatLng } = window.Mapa;
  const $ = (s) => document.querySelector(s);

  let api;
  try {
    api = await window.prepararApi();
  } catch (e) {
    $("#carregando").textContent = textoErro(e);
    return;
  }

  // ---------- Mapa ----------
  const { mapa, camada } = criarMapa($("#mapa"));
  camada.on("error", () => {
    const a = $("#mapa-aviso");
    a.hidden = false;
    a.textContent =
      "A imagem do mapa não carregou. Os pontos aparecem mesmo assim.";
  });

  // Estilo mapa do GTA (js/camadas-gta.js, cópia do mapa da live): nomes que trocam com o
  // zoom, pinos agrupados de longe e ponto aberto em destaque.
  const GTA = window.CamadasGTA;
  // De perto, o fundo troca para a cópia sem os nomes pintados (os nomes vêm do nosso texto)
  let nomesGTA = null;
  // Base SEM nomes pintados (MAPA_BASE_SEM_NOMES): só os nossos nomes, estilo do jogo, surgindo aos poucos
  // (o fundo vetorial, MAPA_BASE_VETOR, também não tem nome pintado: mesmo comportamento)
  const baseSemNomes =
    !!window.CONFIG.MAPA_BASE_SEM_NOMES ||
    !!(camada.usandoVetor && camada.usandoVetor());
  if (baseSemNomes) mapa.getContainer().classList.add("nomes-jogo");
  const fundoLimpo =
    !baseSemNomes &&
    camada.opcoesTiles &&
    window.CONFIG.MAPA_FUNDO_LIMPO !== false
      ? GTA.criarFundoLimpo(L, mapa, {
          url: window.CONFIG.MAPA_TILES_SEM_NOMES,
          opcoesTiles: camada.opcoesTiles,
          aoFalhar: () => nomesGTA && nomesGTA.atualizar(),
        })
      : null;
  camada.on("reserva", () => fundoLimpo && fundoLimpo.remover());
  const agrupamento = GTA.criarAgrupamento(L, mapa, {
    corMarca:
      getComputedStyle(document.documentElement)
        .getPropertyValue("--rosa")
        .trim() || "#ff2e88",
  });
  const lerJson = (url) =>
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  Promise.all([
    lerJson("dados/lugares.json"),
    lerJson("dados/nomes-preservados.json"),
  ])
    .then(([j, pintados]) => {
      if (!j || !Array.isArray(j.lugares)) return;
      // sem o nosso nome onde o nome pintado ficou no pôster (não duplica);
      // nomes desviam das bolinhas de grupo e dos pinos (no celular cobriam)
      const nomes = GTA.criarNomes(
        L,
        mapa,
        GTA.semPintados(j.lugares, fundoLimpo ? pintados : null),
        {
          paraLatLng: (l) => paraLatLng(l.x, l.y),
          obstaculos: agrupamento.retangulos,
          escalonar: baseSemNomes,
          faixas: () =>
            baseSemNomes
              ? GTA.FAIXAS_JOGO
              : fundoLimpo
                ? fundoLimpo.faixas()
                : GTA.FAIXAS_SEM_FUNDO_LIMPO,
        },
      );
      nomesGTA = nomes;
      agrupamento.aoMudar(nomes.atualizar);
    })
    .catch(() => {
      /* sem os nomes: o pôster já tem os nomes impressos */
    });

  let pontos = [];
  let prints = {};
  // Fotos dos sites de guia (decisão do dono, 22/11): img/guias/<id>.webp + creditos.json,
  // casadas pelo "slug" do ponto. Print de seguidor aprovado tem prioridade.
  let fotosGuia = {};
  const pedidoFotosGuia = fetch("img/guias/creditos.json")
    .then((r) => (r.ok ? r.json() : {}))
    .then((c) => {
      const m = {};
      for (const [id, v] of Object.entries(c || {})) {
        if (!v || typeof v !== "object") continue;
        const arq = String(v.arquivo || "");
        const chave = String(v.slug || id);
        const url = linkSeguro(v.url || "");
        if (!/^[a-z0-9-]+\.webp$/.test(arq) || typeof v.site !== "string")
          continue;
        m[chave] = {
          src: "img/guias/" + arq,
          site: v.site.slice(0, 60),
          url,
        };
      }
      fotosGuia = m;
    })
    .catch(() => {
      /* sem fotos de guia: o painel só não mostra a foto */
    });
  const marcadores = {};
  const filtros = new Set(Object.keys(CATEGORIAS));
  let busca = "";
  // Link vindo de outra página (ex.: troféus): index.html?categoria=colecionaveis&busca=carta
  let veioDeLink = false;
  try {
    const q = new URLSearchParams(location.search);
    const cat = q.get("categoria");
    if (cat && CATEGORIAS[cat]) {
      filtros.clear();
      filtros.add(cat);
      veioDeLink = true;
    }
    const b = (q.get("busca") || "").trim().slice(0, 60);
    if (b) {
      $("#busca").value = b;
      busca = semAcento(b);
      veioDeLink = true;
    }
  } catch (e) {
    /* endereço sem filtro */
  }
  let selecionado = null;
  let perfil = null;

  // ---------- Painel lateral direito (detalhe ou formulário) ----------
  const detalhe = $("#detalhe");
  const conteudo = $("#detalhe-conteudo");
  // Botão "voltar" do celular/navegador: abrir a lista ou o painel cria UMA entrada no
  // histórico; o "voltar" fecha o que estiver aberto em vez de sair do site.
  // historico: null | "lista" | "painel" (abrir um ponto da lista reaproveita a entrada).
  let historico = null;
  let ignorarPop = 0;
  function marcarHistorico(oque) {
    if (!historico) {
      try {
        history.pushState({ mapaCamada: true }, "");
      } catch (e) {
        return;
      }
    }
    historico = oque;
  }
  function desfazerHistorico(oque) {
    if (historico !== oque) return;
    historico = null;
    ignorarPop++;
    history.back();
  }
  window.addEventListener("popstate", () => {
    if (ignorarPop > 0) {
      ignorarPop--;
      return;
    }
    const era = historico;
    historico = null;
    if (era === "painel" && !detalhe.hidden) fecharPainelAgora();
    else if (era === "lista") fecharListaAgora();
  });

  function abrirPainel(rotulo, tipo) {
    detalhe.hidden = false;
    detalhe.dataset.tipo = tipo || "ponto";
    detalhe.setAttribute("aria-label", rotulo);
    detalhe.scrollTop = 0;
    conteudo.scrollTop = 0;
    marcarHistorico("painel");
  }
  function fecharPainelAgora() {
    detalhe.hidden = true;
    selecionado = null;
    cancelarEscolha();
    atualizarPinos();
    marcarLista();
  }
  function fecharPainel() {
    desfazerHistorico("painel");
    fecharPainelAgora();
  }
  $("#detalhe-fechar").addEventListener("click", fecharPainel);

  // ---------- Celular: lista ----------
  function abrirLista() {
    document.body.classList.add("lista-aberta");
    $("#btn-lista").setAttribute("aria-expanded", "true");
    marcarHistorico("lista");
  }
  function fecharListaAgora() {
    document.body.classList.remove("lista-aberta");
    $("#btn-lista").setAttribute("aria-expanded", "false");
  }
  function fecharLista() {
    desfazerHistorico("lista");
    fecharListaAgora();
  }
  document.addEventListener("keydown", (ev) => {
    if (
      ev.key === "Escape" &&
      !detalhe.hidden &&
      !document.querySelector("dialog[open]")
    )
      fecharPainel();
  });

  // ---------- Pontos ----------
  function visivel(p) {
    if (!filtros.has(p.categoria)) return false;
    if (!busca) return true;
    const t = semAcento([p.nome, p.regiao, p.o_que_tem].join(" "));
    return busca.split(/\s+/).every((b) => t.includes(b));
  }

  // Quem põe/tira os pinos do mapa é o agrupamento (de longe, pinos perto viram bolinha).
  // O ponto aberto nunca entra em grupo e fica em destaque; os outros ficam apagados.
  const classesAtuais = {};
  function atualizarPinos() {
    const lista = [];
    for (const p of pontos) {
      const m = marcadores[p.id];
      if (!m || !visivel(p)) continue;
      const cl = selecionado === p.id ? "sel" : "";
      // só troca o ícone quando muda (assim o "apagar os outros" anima suave)
      if (classesAtuais[p.id] !== cl) {
        m.setIcon(iconePino(p.categoria, cl, p.subtipo));
        classesAtuais[p.id] = cl;
      }
      m.setZIndexOffset(selecionado === p.id ? 1000 : 0);
      lista.push({
        id: p.id,
        marcador: m,
        latlng: m.getLatLng(),
        pego: false,
        fixo: selecionado === p.id,
      });
    }
    agrupamento.definir(lista);
    GTA.destacar(mapa, selecionado && lista.some((x) => x.id === selecionado));
  }

  // Põe o ponto aberto no meio da parte livre do mapa: acima da folha (celular) ou à
  // esquerda do painel (PC). manterZoom = clique no pino; senão aproxima até -1.5.
  function centralizarPonto(p, manterZoom) {
    if (p.x === null || p.x === undefined) return;
    GTA.centralizar(L, mapa, paraLatLng(p.x, p.y), {
      zoom: manterZoom ? null : Math.max(mapa.getZoom(), -1.5),
      painel: detalhe,
    });
  }
  // A folha do celular cresce depois de abrir (foto carregando): se cobrir o pino, ajusta.
  if (window.ResizeObserver) {
    let espera = null;
    new ResizeObserver(() => {
      clearTimeout(espera);
      espera = setTimeout(() => {
        if (detalhe.hidden || !selecionado) return;
        const p = pontos.find((x) => x.id === selecionado);
        if (!p || p.x === null || p.x === undefined) return;
        if (GTA.coberto(mapa, L.latLng(paraLatLng(p.x, p.y)), detalhe))
          centralizarPonto(p, true);
      }, 150);
    }).observe(detalhe);
  }

  function itemLista(p) {
    const cat = CATEGORIAS[p.categoria] || CATEGORIAS.misterios;
    return el(
      "li",
      null,
      el(
        "button",
        {
          type: "button",
          class: "item",
          dataset: { id: p.id },
          onclick: () => abrirPonto(p.id, true),
        },
        el(
          "span",
          { class: "item-ic", cor: cat.cor },
          U.iconeCategoria(p.categoria, p.subtipo, "item-ic-img"),
        ),
        el(
          "span",
          { class: "item-texto" },
          el("span", { class: "item-nome", text: p.nome }),
          el("span", { class: "item-regiao", text: p.regiao || cat.nome }),
        ),
        p.valor
          ? el("span", { class: "item-valor", text: dinheiro(p.valor) })
          : null,
      ),
    );
  }

  function desenharLista() {
    const noMapa = pontos.filter(
      (p) => p.x !== null && p.x !== undefined && visivel(p),
    );
    const sem = pontos.filter(
      (p) => (p.x === null || p.x === undefined) && visivel(p),
    );
    const ordem = (a, b) => a.nome.localeCompare(b.nome, "pt-BR");
    const lm = limpar($("#lista-mapa"));
    noMapa.sort(ordem).forEach((p) => lm.append(itemLista(p)));
    if (!noMapa.length)
      lm.append(
        el("li", {
          class: "vazio",
          text: busca
            ? "Nada encontrado com essa busca."
            : "Nenhum ponto nessas categorias.",
        }),
      );
    $("#conta-mapa").textContent = noMapa.length;
    const ls = limpar($("#lista-sem"));
    sem.sort(ordem).forEach((p) => ls.append(itemLista(p)));
    $("#conta-sem").textContent = sem.length;
    $("#bloco-sem").hidden = !sem.length;
    $("#conta-lista").textContent = noMapa.length + sem.length;
    marcarLista();
  }
  function marcarLista() {
    document
      .querySelectorAll(".item[data-id]")
      .forEach((b) => b.classList.toggle("sel", b.dataset.id === selecionado));
  }

  function desenharFiltros() {
    const caixa = limpar($("#filtros"));
    for (const [id, c] of Object.entries(CATEGORIAS)) {
      const n = pontos.filter((p) => p.categoria === id).length;
      caixa.append(
        el(
          "button",
          {
            type: "button",
            class: "filtro",
            cor: c.cor,
            "aria-pressed": String(filtros.has(id)),
            onclick: (ev) => {
              filtros.has(id) ? filtros.delete(id) : filtros.add(id);
              ev.currentTarget.setAttribute(
                "aria-pressed",
                String(filtros.has(id)),
              );
              desenharLista();
              atualizarPinos();
            },
          },
          U.iconeCategoria(id, null, "filtro-ic"),
          c.nome,
          el("span", { class: "filtro-conta", text: n }),
        ),
      );
    }
  }

  $("#busca").addEventListener("input", (ev) => {
    busca = semAcento(ev.target.value.trim());
    desenharLista();
    atualizarPinos();
  });

  function campo(titulo, ...corpo) {
    return el(
      "div",
      { class: "det-campo" },
      el("h3", { text: titulo }),
      ...corpo,
    );
  }

  // Foto ampliada: <dialog> simples (fecha com Esc, botão ou clique fora)
  function ampliarFoto(src, alt, legenda) {
    const dlg = el(
      "dialog",
      { class: "dialogo dialogo-foto", "aria-label": alt },
      el("img", { src, alt, decoding: "async" }),
      el(
        "div",
        { class: "dialogo-foto-rodape" },
        legenda,
        el("button", {
          type: "button",
          class: "btn btn-fantasma",
          text: "Fechar",
          onclick: () => dlg.close(),
        }),
      ),
    );
    dlg.addEventListener("click", (ev) => {
      if (ev.target === dlg) dlg.close();
    });
    dlg.addEventListener("close", () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
  }

  function creditoFoto(foto) {
    return el(
      "span",
      { class: "credito-foto" },
      "Foto: ",
      foto.url
        ? el("a", {
            href: foto.url,
            target: "_blank",
            rel: "noopener noreferrer nofollow",
            text: foto.site,
          })
        : foto.site,
    );
  }

  function figuraGuia(p, foto) {
    const alt = "Foto do local: " + p.nome;
    const fig = el(
      "figure",
      { class: "det-img det-img-guia" },
      el(
        "button",
        {
          type: "button",
          class: "det-img-ampliar",
          "aria-label": "Ampliar a foto de " + p.nome,
          onclick: () => ampliarFoto(foto.src, alt, creditoFoto(foto)),
        },
        el("img", {
          src: foto.src,
          alt,
          loading: "lazy",
          decoding: "async",
          onerror: () => fig.remove(),
        }),
      ),
      el("figcaption", null, creditoFoto(foto)),
    );
    return fig;
  }

  function abrirPonto(id, centralizar) {
    const p = pontos.find((x) => x.id === id);
    if (!p) return;
    cancelarEscolha();
    selecionado = id;
    const cat = CATEGORIAS[p.categoria] || CATEGORIAS.misterios;
    limpar(conteudo);
    const autor = p.autor && p.autor.nome ? "@" + p.autor.nome : "Equipe Nauã";
    const fontes = (p.fontes || []).map((f) => linkSeguro(f)).filter(Boolean);
    const urlPrint = p.print_path && prints[p.print_path];
    const fotoGuia = !urlPrint && p.slug ? fotosGuia[p.slug] : null;

    conteudo.append(
      ...[
        el(
          "div",
          { class: "det-cab" },
          el(
            "span",
            { class: "det-cat", cor: cat.cor },
            U.iconeCategoria(p.categoria, p.subtipo, "det-cat-ic"),
            el("span", { text: cat.nome }),
          ),
          p.precisao ? el("span", { class: "selo", text: p.precisao }) : null,
        ),
        el("h2", { class: "det-nome", text: p.nome }),
        el(
          "p",
          { class: "det-autor" },
          "Descoberto por ",
          el("strong", { text: autor }),
          p.descoberto_em ? " · " + data(p.descoberto_em) : "",
        ),
        urlPrint
          ? el(
              "figure",
              { class: "det-img" },
              el("img", {
                src: urlPrint,
                alt: "Print enviado para " + p.nome,
                loading: "lazy",
                decoding: "async",
              }),
              el("figcaption", { text: "Print enviado por " + autor }),
            )
          : fotoGuia
            ? figuraGuia(p, fotoGuia)
            : null,
        p.regiao ? campo("Região", el("p", { text: p.regiao })) : null,
        p.referencia
          ? campo("Onde fica", el("p", { text: p.referencia }))
          : null,
        p.o_que_tem || p.valor
          ? campo(
              "O que tem",
              p.o_que_tem
                ? el("p", { class: "det-forte", text: p.o_que_tem })
                : null,
              p.valor
                ? el("p", { class: "det-valor", text: dinheiro(p.valor) })
                : null,
            )
          : null,
        p.como_pegar
          ? campo("Como pegar", el("p", { text: p.como_pegar }))
          : null,
        p.codigo
          ? campo("Código", el("p", { class: "det-codigo", text: p.codigo }))
          : null,
        p.observacoes
          ? el(
              "div",
              { class: "det-campo det-obs" },
              el("h3", { text: "Atenção" }),
              el("p", { text: p.observacoes }),
            )
          : null,
        fontes.length
          ? campo(
              "Fontes",
              el(
                "ul",
                { class: "fontes" },
                fontes.map((f) =>
                  el(
                    "li",
                    null,
                    "Fonte: ",
                    el("a", {
                      href: f,
                      target: "_blank",
                      rel: "noopener noreferrer nofollow ugc",
                      text: host(f),
                    }),
                  ),
                ),
              ),
            )
          : null,
        el(
          "div",
          { class: "det-rodape" },
          el("button", {
            type: "button",
            class: "link-discreto",
            text: "Denunciar este ponto",
            onclick: () => denunciar(p),
          }),
        ),
      ].filter(Boolean),
    ); // sem os campos vazios (append de null escreveria "null")
    fecharListaAgora();
    abrirPainel("Detalhes de " + p.nome, "ponto");
    atualizarPinos();
    marcarLista();
    // da lista: aproxima; tocando no pino: mantém o zoom. Nos dois casos o pino fica
    // visível acima da folha (celular) ou à esquerda do painel (PC).
    centralizarPonto(p, !centralizar);
  }

  async function denunciar(p) {
    if (!perfil) {
      aviso("Entre com o Discord para denunciar.");
      return;
    }
    const motivo = await perguntar({
      titulo: "Denunciar ponto",
      texto:
        "Conte o que está errado (informação falsa, print impróprio, spam…). A moderação vai olhar.",
      campo: true,
      rotuloCampo: "O que está errado?",
      confirmar: "Enviar denúncia",
      minimo: 5,
    });
    if (!motivo) return;
    try {
      await api.denunciar(p.id, motivo);
      aviso("Denúncia enviada. Valeu demais!");
    } catch (e) {
      aviso(textoErro(e), "erro");
    }
  }

  async function carregarPontos() {
    try {
      pontos = await api.pontos();
    } catch (e) {
      $("#carregando").textContent =
        "Não consegui carregar os pontos. " + textoErro(e);
      return;
    }
    $("#carregando").hidden = true;
    for (const m of Object.values(marcadores)) m.remove();
    for (const k of Object.keys(marcadores)) delete marcadores[k];
    for (const k of Object.keys(classesAtuais)) delete classesAtuais[k];
    for (const p of pontos) {
      if (p.x === null || p.x === undefined) continue;
      const m = L.marker(paraLatLng(p.x, p.y), {
        icon: iconePino(p.categoria, "", p.subtipo),
        title: p.nome,
        alt: p.nome,
        keyboard: true,
        riseOnHover: true,
      });
      // no modo "escolher lugar", tocar num pino marca a posição dele (não abre o ponto)
      m.on("click", (ev) =>
        escolhendo
          ? mapa.fire("click", { latlng: ev.latlng })
          : abrirPonto(p.id, false),
      );
      // Enter num pino (teclado) abre o ponto, como o clique
      m.on("keypress", (ev) => {
        const k = ev.originalEvent;
        if (!escolhendo && k && (k.key === "Enter" || k.keyCode === 13))
          abrirPonto(p.id, false);
      });
      marcadores[p.id] = m;
    }
    desenharFiltros();
    desenharLista();
    atualizarPinos();
    prints = await api.urlsPrints(pontos.map((p) => p.print_path));
  }

  // ---------- Sugerir lugar ----------
  let escolhendo = false;
  let marcadorNovo = null;
  let posicaoNova = null;

  function cancelarEscolha() {
    escolhendo = false;
    $("#escolher").hidden = true;
    $("#mapa").classList.remove("escolhendo");
    if (marcadorNovo) {
      marcadorNovo.remove();
      marcadorNovo = null;
    }
  }
  $("#escolher-cancelar").addEventListener("click", cancelarEscolha);

  $("#btn-sugerir").addEventListener("click", () => {
    if (!perfil) {
      aviso("Entre com o Discord para sugerir um lugar.");
      $("#btn-entrar").focus();
      return;
    }
    if (perfil.banido) {
      aviso("Sua conta está suspensa e não pode enviar sugestões.", "erro");
      return;
    }
    if (!detalhe.hidden) fecharPainel();
    fecharLista();
    escolhendo = true;
    $("#escolher").hidden = false;
    $("#mapa").classList.add("escolhendo");
  });

  mapa.on("click", (ev) => {
    // tocar no mapa (fora do painel) fecha o ponto aberto; o formulário não fecha sozinho
    if (!escolhendo) {
      if (!detalhe.hidden && detalhe.dataset.tipo === "ponto") fecharPainel();
      return;
    }
    escolhendo = false;
    $("#escolher").hidden = true;
    $("#mapa").classList.remove("escolhendo");
    posicaoNova = deLatLng(ev.latlng);
    if (marcadorNovo) marcadorNovo.remove();
    marcadorNovo = L.marker(paraLatLng(posicaoNova.x, posicaoNova.y), {
      icon: iconeNovo(),
      draggable: true,
      title: "Lugar sugerido (arraste para ajustar)",
      zIndexOffset: 2000,
    }).addTo(mapa);
    marcadorNovo.on("dragend", () => {
      posicaoNova = deLatLng(marcadorNovo.getLatLng());
      const pos = document.getElementById("form-posicao");
      if (pos) pos.textContent = textoPosicao();
    });
    abrirFormulario();
  });

  function textoPosicao() {
    return (
      "Posição marcada (x " +
      posicaoNova.x +
      ", y " +
      posicaoNova.y +
      "). Arraste o pino para ajustar."
    );
  }

  function grupo(id, rotulo, controle, ajuda) {
    return el(
      "div",
      { class: "campo" },
      el("label", { for: id, text: rotulo }),
      controle,
      ajuda
        ? el("p", { class: "campo-ajuda", id: id + "-ajuda", text: ajuda })
        : null,
    );
  }

  function abrirFormulario() {
    limpar(conteudo);
    let preparado = null;
    const opcoes = Object.entries(CATEGORIAS).map(([v, c]) =>
      el("option", { value: v, text: c.icone + " " + c.nome }),
    );
    const preview = el("div", { class: "print-preview", hidden: true });
    const erro = el("p", { class: "form-erro", role: "alert", hidden: true });
    const arquivo = el("input", {
      type: "file",
      id: "f-print",
      accept: "image/jpeg,image/png,image/webp",
      "aria-describedby": "f-print-ajuda",
    });
    const enviar = el("button", {
      type: "submit",
      class: "btn btn-primario btn-largo",
      text: "Enviar para a moderação",
    });

    arquivo.addEventListener("change", async () => {
      erro.hidden = true;
      preparado = null;
      limpar(preview);
      preview.hidden = true;
      const f = arquivo.files[0];
      if (!f) return;
      try {
        preview.hidden = false;
        preview.append(
          el("p", { class: "campo-ajuda", text: "Preparando o print…" }),
        );
        preparado = await window.prepararPrint(f);
        limpar(preview);
        const url = URL.createObjectURL(preparado.blob);
        preview.append(
          el("img", { src: url, alt: "Prévia do print" }),
          el("p", {
            class: "campo-ajuda",
            id: "print-info",
            text:
              preparado.largura +
              " × " +
              preparado.altura +
              " px · " +
              Math.round(preparado.blob.size / 1024) +
              " KB · dados escondidos da foto (GPS, celular) removidos",
          }),
        );
      } catch (e) {
        preview.hidden = true;
        arquivo.value = "";
        erro.hidden = false;
        erro.textContent = textoErro(e);
      }
    });

    const form = el(
      "form",
      { class: "form-sugestao", id: "form-sugestao", novalidate: true },
      el("h2", { class: "det-nome", text: "Sugerir lugar" }),
      el("p", {
        class: "campo-ajuda",
        id: "form-posicao",
        text: textoPosicao(),
      }),
      grupo(
        "f-nome",
        "Nome do lugar *",
        el("input", {
          id: "f-nome",
          name: "nome",
          required: true,
          minlength: 3,
          maxlength: 80,
          autocomplete: "off",
        }),
      ),
      grupo(
        "f-categoria",
        "Categoria *",
        el(
          "select",
          { id: "f-categoria", name: "categoria", required: true },
          opcoes,
        ),
      ),
      grupo(
        "f-oque",
        "O que tem *",
        el("input", {
          id: "f-oque",
          name: "o_que_tem",
          required: true,
          minlength: 3,
          maxlength: 500,
          placeholder: "Ex.: pistola dourada, maleta de dinheiro",
        }),
      ),
      grupo(
        "f-valor",
        "Valor em US$ (se for dinheiro)",
        el("input", {
          id: "f-valor",
          name: "valor",
          type: "number",
          min: 0,
          max: 100000000,
          step: 1,
          inputmode: "numeric",
        }),
      ),
      grupo(
        "f-como",
        "Como pegar *",
        el("textarea", {
          id: "f-como",
          name: "como_pegar",
          required: true,
          minlength: 3,
          maxlength: 1500,
          rows: 4,
          placeholder: "Passo a passo: por onde entrar, o que fazer",
        }),
      ),
      grupo(
        "f-codigo",
        "Código (opcional)",
        el("input", {
          id: "f-codigo",
          name: "codigo",
          maxlength: 60,
          autocomplete: "off",
          placeholder: "Ex.: cofre 1234",
        }),
      ),
      grupo(
        "f-print",
        "Print do jogo (opcional)",
        arquivo,
        "JPG, PNG ou WebP até 8 MB. Use só print SEU, nunca imagem de site de guia.",
      ),
      preview,
      el(
        "p",
        { class: "campo-ajuda" },
        "Ao enviar, você aceita as ",
        el("a", {
          href: "regras.html",
          target: "_blank",
          rel: "noopener",
          text: "regras",
        }),
        ". Seu nome do Discord aparece no ponto se ele for aprovado.",
      ),
      erro,
      enviar,
    );

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      erro.hidden = true;
      const d = Object.fromEntries(new FormData(form));
      const faltando = [];
      if ((d.nome || "").trim().length < 3) faltando.push("nome");
      if ((d.o_que_tem || "").trim().length < 3) faltando.push("o que tem");
      if ((d.como_pegar || "").trim().length < 3) faltando.push("como pegar");
      if (faltando.length) {
        erro.hidden = false;
        erro.textContent =
          "Preencha: " + faltando.join(", ") + " (pelo menos 3 letras).";
        return;
      }
      const valor = d.valor === "" ? null : Math.round(Number(d.valor));
      if (
        valor !== null &&
        (!Number.isFinite(valor) || valor < 0 || valor > 1e8)
      ) {
        erro.hidden = false;
        erro.textContent = "Valor inválido.";
        return;
      }
      if (arquivo.files[0] && !preparado) {
        erro.hidden = false;
        erro.textContent = "Espere o print terminar de preparar.";
        return;
      }
      enviar.disabled = true;
      enviar.textContent = "Enviando…";
      try {
        await api.enviarSugestao(
          {
            nome: d.nome.trim(),
            categoria: d.categoria,
            o_que_tem: d.o_que_tem.trim(),
            valor,
            como_pegar: d.como_pegar.trim(),
            codigo: (d.codigo || "").trim() || null,
            x: posicaoNova.x,
            y: posicaoNova.y,
          },
          preparado && preparado.blob,
          preparado && preparado.ext,
        );
        fecharPainel();
        aviso("Sugestão enviada! Valeu demais, a moderação vai conferir.");
        carregarMinhas();
      } catch (e) {
        erro.hidden = false;
        erro.textContent = textoErro(e);
        enviar.disabled = false;
        enviar.textContent = "Enviar para a moderação";
      }
    });

    conteudo.append(form);
    abrirPainel("Sugerir lugar", "formulario");
    setTimeout(() => $("#f-nome").focus(), 50);
  }

  // ---------- Minhas sugestões ----------
  const ROTULO_STATUS = {
    pendente: "Em análise",
    aprovada: "Aprovada",
    recusada: "Recusada",
  };
  async function carregarMinhas() {
    const bloco = $("#bloco-minhas");
    if (!perfil) {
      bloco.hidden = true;
      return;
    }
    let lista = [];
    try {
      lista = await api.minhasSugestoes();
    } catch (e) {
      lista = [];
    }
    bloco.hidden = false;
    $("#conta-minhas").textContent = lista.length;
    const ul = limpar($("#lista-minhas"));
    if (!lista.length)
      ul.append(
        el("li", {
          class: "vazio",
          text: "Nada por aqui ainda. Bora marcar o primeiro lugar em “Sugerir lugar”?",
        }),
      );
    for (const s of lista) {
      const cat = CATEGORIAS[s.categoria] || CATEGORIAS.misterios;
      ul.append(
        el(
          "li",
          { class: "minha" },
          el(
            "span",
            { class: "item-ic", cor: cat.cor },
            U.iconeCategoria(s.categoria, s.subtipo, "item-ic-img"),
          ),
          el(
            "div",
            { class: "item-texto" },
            el("span", { class: "item-nome", text: s.nome }),
            el(
              "span",
              { class: "item-regiao" },
              el("span", {
                class: "status status-" + s.status,
                text: ROTULO_STATUS[s.status] || s.status,
              }),
              " · " + data(s.criado),
            ),
            s.status === "recusada" && s.motivo
              ? el("span", {
                  class: "minha-motivo",
                  text: "Motivo: " + s.motivo,
                })
              : null,
          ),
          s.status === "aprovada" && s.ponto_id
            ? el("button", {
                type: "button",
                class: "btn btn-fantasma btn-peq",
                text: "Ver",
                onclick: () => abrirPonto(s.ponto_id, true),
              })
            : s.status === "pendente"
              ? el("button", {
                  type: "button",
                  class: "btn btn-fantasma btn-peq",
                  text: "Apagar",
                  "aria-label": "Apagar a sugestão " + s.nome,
                  onclick: async () => {
                    const ok = await perguntar({
                      titulo: "Apagar sugestão?",
                      texto:
                        "A sugestão e o print dela serão apagados. Não dá para desfazer.",
                      confirmar: "Apagar",
                      perigo: true,
                    });
                    if (!ok) return;
                    try {
                      await api.apagarSugestao(s);
                      aviso("Sugestão apagada.");
                      carregarMinhas();
                    } catch (e) {
                      aviso(textoErro(e), "erro");
                    }
                  },
                })
              : null,
        ),
      );
    }
  }
  $("#menu-minhas").addEventListener("click", () => {
    abrirLista();
    $("#bloco-minhas").scrollIntoView({ block: "start" });
  });

  // ---------- Ofertas e patrocínio ----------
  function imagemOferta(src, alt) {
    const ok = imagemSegura(src || "");
    return ok
      ? el("img", {
          src: ok,
          alt: alt || "",
          loading: "lazy",
          width: 56,
          height: 56,
        })
      : null;
  }
  async function carregarOfertas() {
    try {
      const [pat, ofs] = await Promise.all([api.patrocinio(), api.afiliados()]);
      const ul = limpar($("#lista-ofertas"));
      for (const o of ofs || []) {
        const link = linkSeguro(o.link);
        if (!link) continue; // link que não é https não aparece
        ul.append(
          el(
            "li",
            null,
            el(
              "a",
              {
                class: "oferta",
                href: link,
                target: "_blank",
                rel: "sponsored noopener noreferrer",
              },
              imagemOferta(o.imagem, ""),
              el(
                "span",
                { class: "oferta-texto" },
                el("strong", { text: o.titulo }),
                o.descricao ? el("span", { text: o.descricao }) : null,
                el("span", {
                  class: "oferta-loja",
                  text: [o.loja, o.preco_texto].filter(Boolean).join(" · "),
                }),
              ),
            ),
          ),
        );
      }
      $("#bloco-ofertas").hidden = !ul.children.length;

      const caixa = limpar($("#patrocinio"));
      const link = pat && linkSeguro(pat.link);
      if (pat && pat.texto && link) {
        caixa.append(
          el("span", { class: "patrocinio-rotulo", text: "Patrocínio" }),
          el(
            "a",
            {
              class: "patrocinio-link",
              href: link,
              target: "_blank",
              rel: "sponsored noopener noreferrer",
            },
            imagemOferta(pat.imagem, ""),
            el("span", { text: pat.texto }),
          ),
        );
        caixa.hidden = false;
      } else caixa.hidden = true;
    } catch (e) {
      /* ofertas são opcionais: se falhar, só não aparecem */
    }
  }

  $("#btn-lista").addEventListener("click", () => {
    if (document.body.classList.contains("lista-aberta")) fecharLista();
    else abrirLista();
  });

  // PC (proposta C): a lista do bloco flutuante abre e fecha, para não tampar o mapa.
  // Começa fechada; a escolha fica lembrada neste navegador. Buscar algo abre a lista.
  const btnRecolher = $("#btn-recolher");
  function definirRecolhida(recolhida) {
    document.body.classList.toggle("lista-recolhida", recolhida);
    btnRecolher.setAttribute("aria-expanded", String(!recolhida));
    try {
      localStorage.setItem("mapa-lista-recolhida", recolhida ? "1" : "0");
    } catch (e) {
      /* sem armazenamento: só não lembra */
    }
  }
  let comecaRecolhida = true;
  try {
    comecaRecolhida = localStorage.getItem("mapa-lista-recolhida") !== "0";
  } catch (e) {
    /* sem armazenamento: começa fechada */
  }
  definirRecolhida(comecaRecolhida);
  btnRecolher.addEventListener("click", () =>
    definirRecolhida(!document.body.classList.contains("lista-recolhida")),
  );
  $("#busca").addEventListener("input", (ev) => {
    if (
      ev.target.value.trim() &&
      document.body.classList.contains("lista-recolhida")
    )
      definirRecolhida(false);
  });

  // ---------- Conta ----------
  await window.Conta.iniciar(api, (p) => {
    perfil = p;
    $("#aviso-banido").hidden = !(p && p.banido);
    carregarMinhas();
  });
  await pedidoFotosGuia;
  await carregarPontos();
  carregarOfertas();
  if (veioDeLink) {
    const nVisiveis = pontos.filter(visivel).length;
    aviso(
      nVisiveis
        ? "Filtro aplicado: " +
            nVisiveis +
            " ponto(s). Toque nas categorias para ver tudo."
        : "Ainda não há pontos disso no mapa. Toque nas categorias para ver tudo.",
    );
  }

  // Para os testes automáticos saberem que a página terminou de carregar.
  document.documentElement.dataset.pronto = "1";
})();
