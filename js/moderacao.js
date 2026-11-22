// Painel de moderação. Esconder botões aqui é só conforto: quem barra de verdade é o banco
// (cada função confere o papel de quem chama). Um usuário comum que abrir esta página não consegue nada.
(async function () {
  "use strict";
  const {
    CATEGORIAS,
    el,
    limpar,
    linkSeguro,
    imagemSegura,
    dinheiro,
    data,
    aviso,
    textoErro,
    perguntar,
  } = window.U;
  const { criarMapa, iconeNovo, paraLatLng, deLatLng } = window.Mapa;
  const $ = (s) => document.querySelector(s);

  let api;
  try {
    api = await window.prepararApi();
  } catch (e) {
    $("#sem-acesso").hidden = false;
    $("#sem-acesso-texto").textContent = textoErro(e);
    return;
  }

  let perfil = null;
  let fila = [];
  let atual = null;
  let mini = null;
  let pinoMini = null;
  let posMini = null;

  const ehMod = (p) =>
    p && !p.banido && (p.papel === "moderador" || p.papel === "dono");
  const ehDono = (p) => p && !p.banido && p.papel === "dono";

  // ---------- Abas ----------
  const abas = [...document.querySelectorAll(".aba")];
  function abrirAba(aba) {
    for (const a of abas) {
      const sel = a === aba;
      a.setAttribute("aria-selected", String(sel));
      a.tabIndex = sel ? 0 : -1;
      $("#" + a.getAttribute("aria-controls")).hidden = !sel;
    }
    const id = aba.id;
    if (id === "aba-fila") carregarFila();
    if (id === "aba-denuncias") carregarDenuncias();
    if (id === "aba-registro") {
      carregarLog();
      carregarRemovidos();
    }
    if (id === "aba-usuarios") carregarUsuarios();
    if (id === "aba-ofertas") carregarOfertas();
  }
  abas.forEach((a) => a.addEventListener("click", () => abrirAba(a)));
  $(".abas").addEventListener("keydown", (ev) => {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    const visiveis = abas.filter((a) => !a.hidden);
    const i = visiveis.indexOf(document.activeElement);
    if (i < 0) return;
    const prox =
      visiveis[
        (i + (ev.key === "ArrowRight" ? 1 : -1) + visiveis.length) %
          visiveis.length
      ];
    prox.focus();
    abrirAba(prox);
  });

  // ---------- Fila de sugestões ----------
  async function carregarFila() {
    try {
      fila = await api.mod.fila("pendente");
    } catch (e) {
      aviso(textoErro(e), "erro");
      fila = [];
    }
    $("#n-fila").textContent = fila.length;
    const ul = limpar($("#fila-lista"));
    if (!fila.length) {
      ul.append(
        el("li", {
          class: "vazio",
          text: "Nenhuma sugestão esperando. Tudo em dia!",
        }),
      );
      if (mini) {
        mini.mapa.stop();
        mini.mapa.remove();
        mini = null;
      }
      limpar($("#fila-detalhe")).append(
        el("p", { class: "vazio-grande", text: "Sem sugestões na fila." }),
      );
      atual = null;
      return;
    }
    for (const s of fila) {
      const cat = CATEGORIAS[s.categoria] || CATEGORIAS.misterios;
      ul.append(
        el(
          "li",
          null,
          el(
            "button",
            {
              type: "button",
              class: "item",
              dataset: { id: s.id },
              onclick: () => abrirSugestao(s.id),
            },
            el("span", { class: "item-ic", cor: cat.cor }, U.iconeCategoria(s.categoria, s.subtipo, "item-ic-img")),
            el(
              "span",
              { class: "item-texto" },
              el("span", { class: "item-nome", text: s.nome }),
              el("span", {
                class: "item-regiao",
                text:
                  "@" +
                  ((s.autor && s.autor.nome) || "?") +
                  " · " +
                  data(s.criado),
              }),
            ),
            s.print_path
              ? el("span", { class: "tem-print", text: "print" })
              : null,
          ),
        ),
      );
    }
    abrirSugestao(
      atual && fila.some((s) => s.id === atual.id) ? atual.id : fila[0].id,
    );
  }

  function campoTexto(id, rotulo, valor, opcoes) {
    const o = opcoes || {};
    const controle = o.area
      ? el("textarea", { id, rows: o.linhas || 3, maxlength: o.max || 500 })
      : el("input", {
          id,
          type: o.tipo || "text",
          maxlength: o.max || 200,
          min: o.min,
          max: o.maxNum,
          step: o.passo,
        });
    controle.value = valor === null || valor === undefined ? "" : String(valor);
    return el(
      "div",
      { class: "campo" + (o.largo ? " campo-largo" : "") },
      el("label", { for: id, text: rotulo }),
      controle,
    );
  }

  async function abrirSugestao(id) {
    atual = fila.find((s) => s.id === id);
    if (!atual) return;
    document
      .querySelectorAll("#fila-lista .item")
      .forEach((b) => b.classList.toggle("sel", b.dataset.id === id));
    const s = atual;
    // desmonta o mini mapa anterior ANTES de apagar o HTML dele (evita erro do Leaflet)
    if (mini) {
      mini.mapa.stop();
      mini.mapa.remove();
      mini = null;
    }
    const caixa = limpar($("#fila-detalhe"));
    const opcoes = Object.entries(CATEGORIAS).map(([v, c]) => {
      const o = el("option", { value: v, text: c.icone + " " + c.nome });
      if (v === s.categoria) o.selected = true;
      return o;
    });
    const figura = el(
      "figure",
      { class: "det-img mod-print" },
      el("p", {
        class: "campo-ajuda",
        text: s.print_path ? "Carregando o print…" : "Sem print.",
      }),
    );
    const mapaEl = el("div", {
      class: "mini-mapa",
      id: "mini-mapa",
      "aria-label": "Posição sugerida no mapa",
    });
    posMini = { x: s.x, y: s.y };
    const textoPos = el("p", {
      class: "campo-ajuda",
      id: "mini-pos",
      text: "x " + s.x + ", y " + s.y + " · arraste o pino para corrigir",
    });

    caixa.append(
      el(
        "div",
        { class: "mod-cab" },
        el("h2", { class: "det-nome", text: s.nome }),
        el(
          "p",
          { class: "det-autor" },
          "Enviada por ",
          el("strong", { text: "@" + ((s.autor && s.autor.nome) || "?") }),
          " · " + data(s.criado),
        ),
      ),
      el(
        "div",
        { class: "mod-grade" },
        el("div", { class: "mod-visual" }, figura, mapaEl, textoPos),
        el(
          "form",
          { class: "form-sugestao mod-form", id: "form-mod", novalidate: true },
          campoTexto("m-nome", "Nome", s.nome, { max: 80 }),
          el(
            "div",
            { class: "campo" },
            el("label", { for: "m-categoria", text: "Categoria" }),
            el("select", { id: "m-categoria" }, opcoes),
          ),
          campoTexto("m-regiao", "Região (opcional)", "", { max: 300 }),
          campoTexto("m-oque", "O que tem", s.o_que_tem, { max: 500 }),
          campoTexto("m-valor", "Valor US$", s.valor, {
            tipo: "number",
            min: 0,
            maxNum: 100000000,
            passo: 1,
          }),
          campoTexto("m-como", "Como pegar", s.como_pegar, {
            area: true,
            linhas: 4,
            max: 1500,
          }),
          campoTexto("m-codigo", "Código", s.codigo, { max: 60 }),
          el(
            "div",
            { class: "mod-acoes" },
            el("button", {
              type: "button",
              class: "btn btn-ok",
              id: "btn-aprovar",
              text: "Aprovar",
              onclick: () => aprovar(false),
            }),
            el("button", {
              type: "button",
              class: "btn",
              id: "btn-editar-aprovar",
              text: "Editar e aprovar",
              onclick: () => aprovar(true),
            }),
            el("button", {
              type: "button",
              class: "btn btn-perigo",
              id: "btn-recusar",
              text: "Recusar",
              onclick: recusar,
            }),
          ),
          el("p", {
            class: "campo-ajuda",
            text: "“Aprovar” publica como o jogador mandou. “Editar e aprovar” publica com as suas correções (inclusive a posição).",
          }),
        ),
      ),
    );

    // mini mapa
    mini = criarMapa(mapaEl, { mini: true, zoomControl: true });
    pinoMini = L.marker(paraLatLng(s.x, s.y), {
      icon: iconeNovo(),
      draggable: true,
      title: "Posição sugerida",
    }).addTo(mini.mapa);
    pinoMini.on("dragend", () => {
      posMini = deLatLng(pinoMini.getLatLng());
      textoPos.textContent =
        "x " + posMini.x + ", y " + posMini.y + " · posição corrigida";
    });
    const esteMapa = mini.mapa;
    setTimeout(() => {
      if (mini && mini.mapa === esteMapa) {
        esteMapa.invalidateSize({ animate: false });
        esteMapa.setView(paraLatLng(s.x, s.y), -1.5, { animate: false });
      }
    }, 50);

    if (s.print_path) {
      const urls = await api.urlsPrints([s.print_path]);
      limpar(figura);
      const u = urls[s.print_path] && imagemSegura(urls[s.print_path]);
      if (u)
        figura.append(
          el("img", { src: u, alt: "Print enviado com a sugestão" }),
          el("figcaption", {
            text: "Confira se é print do jogo (não de site de guia) e se não mostra dados pessoais.",
          }),
        );
      else
        figura.append(
          el("p", { class: "campo-ajuda", text: "O print não carregou." }),
        );
    }
  }

  function edicoesDoFormulario() {
    const s = atual;
    const e = {};
    const v = (id) => $("#" + id).value.trim();
    if (v("m-nome") !== s.nome) e.nome = v("m-nome");
    if (v("m-categoria") !== s.categoria) e.categoria = v("m-categoria");
    if (v("m-regiao")) e.regiao = v("m-regiao");
    if (v("m-oque") !== (s.o_que_tem || "")) e.o_que_tem = v("m-oque");
    const valor = v("m-valor") === "" ? null : Math.round(Number(v("m-valor")));
    if (
      valor !==
      (s.valor === null || s.valor === undefined ? null : Number(s.valor))
    )
      e.valor = valor;
    if (v("m-como") !== (s.como_pegar || "")) e.como_pegar = v("m-como");
    if (v("m-codigo") !== (s.codigo || "")) e.codigo = v("m-codigo");
    if (posMini.x !== s.x || posMini.y !== s.y) {
      e.x = posMini.x;
      e.y = posMini.y;
    }
    return e;
  }

  function travarBotoes(t) {
    ["#btn-aprovar", "#btn-editar-aprovar", "#btn-recusar"].forEach((b) => {
      const x = $(b);
      if (x) x.disabled = t;
    });
  }

  async function aprovar(comEdicao) {
    const e = comEdicao ? edicoesDoFormulario() : {};
    if (!comEdicao && Object.keys(edicoesDoFormulario()).length) {
      const ok = await perguntar({
        titulo: "Aprovar sem as suas mudanças?",
        texto:
          "Você mexeu em campos. “Aprovar” ignora as mudanças. Para publicar com elas, use “Editar e aprovar”.",
        confirmar: "Aprovar sem mudanças",
      });
      if (!ok) return;
    }
    if (
      e.valor !== undefined &&
      e.valor !== null &&
      (!Number.isFinite(e.valor) || e.valor < 0)
    ) {
      aviso("Valor inválido.", "erro");
      return;
    }
    travarBotoes(true);
    try {
      await api.mod.aprovar(atual.id, e);
      aviso("Aprovada e publicada no mapa.");
      atual = null;
      await carregarFila();
    } catch (err) {
      aviso(textoErro(err), "erro");
      travarBotoes(false);
    }
  }

  async function recusar() {
    const motivo = await perguntar({
      titulo: "Recusar sugestão",
      texto: "O jogador vai ver este motivo em “Minhas sugestões”.",
      campo: true,
      rotuloCampo: "Motivo da recusa",
      confirmar: "Recusar",
      perigo: true,
    });
    if (!motivo) return;
    travarBotoes(true);
    try {
      await api.mod.recusar(atual.id, motivo);
      aviso("Sugestão recusada.");
      atual = null;
      await carregarFila();
    } catch (err) {
      aviso(textoErro(err), "erro");
      travarBotoes(false);
    }
  }

  // ---------- Denúncias ----------
  async function carregarDenuncias() {
    let lista = [];
    try {
      lista = await api.mod.denuncias();
    } catch (e) {
      aviso(textoErro(e), "erro");
    }
    $("#n-denuncias").textContent = lista.length;
    const ul = limpar($("#lista-denuncias"));
    if (!lista.length)
      ul.append(el("li", { class: "vazio", text: "Nenhuma denúncia aberta." }));
    for (const d of lista) {
      ul.append(
        el(
          "li",
          { class: "cartao" },
          el("h3", {
            class: "cartao-titulo",
            text: d.ponto_nome || "(ponto já removido)",
          }),
          el("p", { class: "cartao-texto", text: d.motivo }),
          el("p", {
            class: "campo-ajuda",
            text:
              "Denunciado por @" +
              ((d.autor && d.autor.nome) || "?") +
              " · " +
              data(d.criado),
          }),
          el(
            "div",
            { class: "mod-acoes" },
            el("button", {
              type: "button",
              class: "btn",
              text: "Descartar",
              onclick: async () => {
                try {
                  await api.mod.resolverDenuncia(d.id, "descartar", null);
                  aviso("Denúncia descartada.");
                  carregarDenuncias();
                } catch (e) {
                  aviso(textoErro(e), "erro");
                }
              },
            }),
            el("button", {
              type: "button",
              class: "btn btn-perigo",
              text: "Remover o ponto",
              onclick: async () => {
                const nota = await perguntar({
                  titulo: "Remover o ponto do mapa?",
                  texto:
                    "O ponto sai do mapa para todo mundo. A ação fica no registro.",
                  campo: true,
                  rotuloCampo: "Por que remover?",
                  confirmar: "Remover",
                  perigo: true,
                });
                if (!nota) return;
                try {
                  await api.mod.resolverDenuncia(d.id, "remover_ponto", nota);
                  aviso("Ponto removido.");
                  carregarDenuncias();
                } catch (e) {
                  aviso(textoErro(e), "erro");
                }
              },
            }),
          ),
        ),
      );
    }
  }

  // ---------- Registro ----------
  const ACOES = {
    aprovar_sugestao: "Aprovou sugestão",
    recusar_sugestao: "Recusou sugestão",
    editar_ponto: "Editou ponto",
    remover_ponto: "Removeu ponto",
    resolver_denuncia: "Resolveu denúncia",
    definir_papel: "Mudou papel",
    banir: "Baniu",
    desbanir: "Desbaniu",
    salvar_patrocinio: "Mudou patrocínio",
    salvar_afiliado: "Salvou oferta",
    apagar_afiliado: "Apagou oferta",
    limpar_recusadas: "Limpou recusadas",
    restaurar_ponto: "Restaurou ponto",
  };
  function resumo(d) {
    if (!d || typeof d !== "object") return "";
    const partes = [];
    for (const k of [
      "nome",
      "titulo",
      "ponto",
      "motivo",
      "para",
      "acao",
      "texto",
    ])
      if (d[k] !== undefined && d[k] !== null && typeof d[k] !== "object")
        partes.push(String(d[k]));
    if (d.editou) partes.push("(com edição)");
    return partes.join(" · ").slice(0, 200);
  }
  async function carregarLog() {
    let lista = [];
    try {
      lista = await api.mod.log();
    } catch (e) {
      aviso(textoErro(e), "erro");
    }
    const tb = limpar($("#tabela-log tbody"));
    if (!lista.length)
      tb.append(
        el(
          "tr",
          null,
          el("td", {
            colspan: 4,
            class: "vazio",
            text: "Nada registrado ainda.",
          }),
        ),
      );
    for (const l of lista) {
      const quando = new Date(l.criado);
      tb.append(
        el(
          "tr",
          null,
          el("td", {
            text: isNaN(quando)
              ? ""
              : quando.toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }),
          }),
          el("td", { text: (l.ator && l.ator.nome) || "—" }),
          el("td", { text: ACOES[l.acao] || l.acao }),
          el("td", { text: resumo(l.detalhes) }),
        ),
      );
    }
  }

  // ---------- Pontos removidos (dono restaura) ----------
  async function carregarRemovidos() {
    if (!ehDono(perfil)) return;
    let lista = [];
    try {
      lista = await api.mod.pontosRemovidos();
    } catch (e) {
      aviso(textoErro(e), "erro");
    }
    const ul = limpar($("#lista-removidos"));
    if (!lista.length)
      ul.append(
        el("li", { class: "vazio", text: "Nenhum ponto removido." }),
      );
    for (const p of lista) {
      const quando = new Date(p.removido_em);
      ul.append(
        el(
          "li",
          { class: "cartao usuario" },
          el(
            "div",
            { class: "usuario-texto" },
            el("strong", { text: p.nome }),
            el("span", {
              class: "campo-ajuda",
              text:
                (isNaN(quando) ? "" : quando.toLocaleDateString("pt-BR") + " · ") +
                (p.removido_por_nome ? p.removido_por_nome + " · " : "") +
                (p.removido_motivo || ""),
            }),
          ),
          el(
            "div",
            { class: "usuario-acoes" },
            el("button", {
              type: "button",
              class: "btn btn-peq btn-ok",
              text: "Restaurar",
              onclick: async () => {
                try {
                  await api.mod.restaurarPonto(p.id);
                  aviso("Ponto de volta no mapa.");
                } catch (e) {
                  aviso(textoErro(e), "erro");
                }
                carregarRemovidos();
                carregarLog();
              },
            }),
          ),
        ),
      );
    }
  }

  // ---------- Usuários (dono) ----------
  async function carregarUsuarios() {
    let lista = [];
    try {
      lista = await api.mod.usuarios($("#busca-usuarios").value.trim());
    } catch (e) {
      aviso(textoErro(e), "erro");
    }
    const ul = limpar($("#lista-usuarios"));
    if (!lista.length)
      ul.append(el("li", { class: "vazio", text: "Ninguém encontrado." }));
    for (const u of lista) {
      const proprio = perfil && u.id === perfil.id;
      const sel = el("select", {
        "aria-label": "Papel de " + u.nome,
        disabled: u.papel === "dono" || proprio,
      });
      for (const [v, t] of [
        ["usuario", "Jogador"],
        ["moderador", "Moderador"],
        ["dono", "Dono"],
      ]) {
        const o = el("option", { value: v, text: t, disabled: v === "dono" });
        if (v === u.papel) o.selected = true;
        sel.append(o);
      }
      sel.addEventListener("change", async () => {
        try {
          await api.mod.definirPapel(u.id, sel.value);
          aviso(
            u.nome +
              " agora é " +
              (sel.value === "moderador" ? "moderador" : "jogador") +
              ".",
          );
          carregarUsuarios();
        } catch (e) {
          aviso(textoErro(e), "erro");
          carregarUsuarios();
        }
      });
      const avatar = el("span", { class: "avatar", "aria-hidden": "true" });
      const src = imagemSegura(u.avatar || "");
      if (src)
        avatar.append(
          el("img", { src, alt: "", referrerpolicy: "no-referrer" }),
        );
      else avatar.textContent = (u.nome || "?").charAt(0).toUpperCase();
      ul.append(
        el(
          "li",
          { class: "cartao usuario" + (u.banido ? " usuario-banido" : "") },
          avatar,
          el(
            "div",
            { class: "usuario-texto" },
            el("strong", { text: u.nome }),
            el("span", {
              class: "campo-ajuda",
              text:
                (u.banido ? "SUSPENSO · " : "") +
                (u.sugestoes || 0) +
                " sugestões, " +
                (u.aprovadas || 0) +
                " aprovadas",
            }),
          ),
          el(
            "div",
            { class: "usuario-acoes" },
            sel,
            u.papel === "dono" || proprio
              ? null
              : el("button", {
                  type: "button",
                  class: "btn btn-peq " + (u.banido ? "" : "btn-perigo"),
                  text: u.banido ? "Tirar suspensão" : "Suspender",
                  onclick: async () => {
                    let motivo = null;
                    if (!u.banido) {
                      motivo = await perguntar({
                        titulo: "Suspender " + u.nome + "?",
                        texto:
                          "A pessoa não poderá mais sugerir nem denunciar. Sugestões em análise dela serão recusadas.",
                        campo: true,
                        rotuloCampo: "Motivo",
                        confirmar: "Suspender",
                        perigo: true,
                      });
                      if (!motivo) return;
                    }
                    try {
                      await api.mod.banir(u.id, !u.banido, motivo);
                      aviso(
                        u.banido ? "Suspensão retirada." : "Conta suspensa.",
                      );
                      carregarUsuarios();
                    } catch (e) {
                      aviso(textoErro(e), "erro");
                    }
                  },
                }),
          ),
        ),
      );
    }
  }
  $("#form-busca-usuarios").addEventListener("submit", (ev) => {
    ev.preventDefault();
    carregarUsuarios();
  });

  // ---------- Patrocínio e ofertas (dono) ----------
  async function carregarOfertas() {
    try {
      const p = await api.mod.patrocinio();
      $("#pat-texto").value = p.texto || "";
      $("#pat-link").value = p.link || "";
      $("#pat-imagem").value = p.imagem || "";
      $("#pat-ativo").checked = !!p.ativo;
      desenharAfiliados(await api.mod.afiliados());
    } catch (e) {
      aviso(textoErro(e), "erro");
    }
  }
  $("#form-patrocinio").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const d = {
      texto: $("#pat-texto").value.trim(),
      link: $("#pat-link").value.trim(),
      imagem: $("#pat-imagem").value.trim(),
      ativo: $("#pat-ativo").checked,
    };
    if (d.link && !linkSeguro(d.link))
      return aviso("O link precisa começar com https://", "erro");
    if (d.imagem && !imagemSegura(d.imagem))
      return aviso(
        "Imagem inválida: use img/arquivo.webp ou um link do Storage do Supabase.",
        "erro",
      );
    try {
      await api.mod.salvarPatrocinio(d);
      aviso("Patrocínio salvo.");
    } catch (e) {
      aviso(textoErro(e), "erro");
    }
  });

  function formAfiliado(a) {
    const id = a ? a.id : "nova";
    const f = el(
      "form",
      { class: "cartao form-sugestao oferta-form" },
      campoTexto("af-titulo-" + id, "Título", a && a.titulo, { max: 80 }),
      campoTexto("af-desc-" + id, "Descrição", a && a.descricao, { max: 200 }),
      campoTexto("af-loja-" + id, "Loja", a && a.loja, { max: 40 }),
      campoTexto("af-preco-" + id, "Preço (texto)", a && a.preco_texto, {
        max: 40,
      }),
      campoTexto("af-link-" + id, "Link de afiliado (https://)", a && a.link, {
        tipo: "url",
        max: 500,
      }),
      campoTexto("af-imagem-" + id, "Imagem (opcional)", a && a.imagem, {
        max: 300,
      }),
      campoTexto("af-ordem-" + id, "Ordem", a ? a.ordem : 0, {
        tipo: "number",
        passo: 1,
      }),
      el(
        "label",
        { class: "caixa-check" },
        el("input", {
          type: "checkbox",
          id: "af-ativo-" + id,
          checked: !a || a.ativo,
        }),
        "Mostrar no mapa",
      ),
      a && !linkSeguro(a.link || "")
        ? el("p", {
            class: "campo-erro",
            text: "Este link não é https: ele NÃO aparece no mapa.",
          })
        : null,
      el(
        "div",
        { class: "mod-acoes" },
        el("button", {
          type: "submit",
          class: "btn btn-primario btn-peq",
          text: a ? "Salvar" : "Criar oferta",
        }),
        a
          ? el("button", {
              type: "button",
              class: "btn btn-fantasma btn-peq",
              text: "Apagar",
              onclick: async () => {
                if (
                  !(await perguntar({
                    titulo: "Apagar oferta?",
                    texto: a.titulo,
                    confirmar: "Apagar",
                    perigo: true,
                  }))
                )
                  return;
                try {
                  await api.mod.apagarAfiliado(a.id);
                  carregarOfertas();
                } catch (e) {
                  aviso(textoErro(e), "erro");
                }
              },
            })
          : null,
      ),
    );
    f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const v = (k) => $("#af-" + k + "-" + id).value.trim();
      const d = {
        titulo: v("titulo"),
        descricao: v("desc"),
        loja: v("loja"),
        preco_texto: v("preco"),
        link: v("link"),
        imagem: v("imagem"),
        ordem: Number(v("ordem")) || 0,
        ativo: $("#af-ativo-" + id).checked,
      };
      if (!linkSeguro(d.link))
        return aviso("O link precisa começar com https://", "erro");
      if (d.imagem && !imagemSegura(d.imagem))
        return aviso("Imagem inválida.", "erro");
      try {
        await api.mod.salvarAfiliado(a ? a.id : null, d);
        aviso("Oferta salva.");
        carregarOfertas();
      } catch (e) {
        aviso(textoErro(e), "erro");
      }
    });
    return el("li", null, f);
  }
  function desenharAfiliados(lista) {
    const ul = limpar($("#lista-afiliados"));
    if (!lista.length)
      ul.append(el("li", { class: "vazio", text: "Nenhuma oferta ainda." }));
    lista.forEach((a) => ul.append(formAfiliado(a)));
  }
  $("#btn-nova-oferta").addEventListener("click", () => {
    if (document.getElementById("af-titulo-nova")) return;
    $("#lista-afiliados").prepend(formAfiliado(null));
    $("#af-titulo-nova").focus();
  });
  $("#btn-limpar").addEventListener("click", async () => {
    try {
      const n = await api.mod.limparRecusadas();
      aviso(n ? n + " prints antigos apagados." : "Nada antigo para limpar.");
    } catch (e) {
      aviso(textoErro(e), "erro");
    }
  });
  const reiniciar = $("#btn-reiniciar-demo");
  reiniciar.hidden = !api.demo;
  reiniciar.addEventListener("click", () => {
    api.reiniciarDemo();
    location.reload();
  });

  // ---------- Conta ----------
  await window.Conta.iniciar(api, (p) => {
    perfil = p;
    const pode = ehMod(p);
    $("#painel").hidden = !pode;
    $("#sem-acesso").hidden = pode;
    $("#sem-acesso-texto").textContent = !p
      ? "Entre com o Discord. Só moderadores e o dono veem esta página."
      : "Sua conta não é de moderação. Se precisar de acesso, fale com o dono do mapa.";
    document
      .querySelectorAll(".so-dono")
      .forEach((a) => (a.hidden = !ehDono(p)));
    if (pode) {
      abrirAba($("#aba-fila"));
      carregarDenuncias();
    }
  });
  document.documentElement.dataset.pronto = "1";
})();
