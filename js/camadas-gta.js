// Camadas "estilo mapa do GTA" para um mapa Leaflet. Não depende do app.js:
// dá para levar para o site público só com este arquivo + css/camadas-gta.css
// (o site-publico usa uma CÓPIA, feita por site-publico/ferramentas/copiar-camadas-gta.js).
// Tudo é montado com elementos + textContent (sem HTML em texto nem style inline): passa na CSP do site público.
//   CamadasGTA.criarNomes(L, mapa, lugares, opcoes)      -> nomes que trocam com o zoom
//   CamadasGTA.criarAgrupamento(L, mapa, opcoes)          -> bolinhas com o número de pontos
//   CamadasGTA.centralizar(L, mapa, latlng, opcoes)       -> centraliza descontando o painel aberto
//   CamadasGTA.destacar(mapa, ligado)                     -> apaga os outros pinos quando há um selecionado
(function () {
  // Faixas de zoom de cada nível de nome: [a partir de, até] (zoom do Leaflet; -4.5 longe ... 0.5 perto).
  // 1 = região/condado (nome grande), 2 = cidade/bairro/ilha, 3 = detalhe.
  // O pôster já tem os nomes impressos, legíveis a partir de ~-1.5: cada nível some quando o
  // nome impresso fica grande o bastante para ler, para não aparecer o mesmo nome duas vezes.
  const FAIXAS_ZOOM = {
    1: [-Infinity, -2.5],
    2: [-2.5, -1.75],
    3: [-2.0, -1.5],
  };
  // Grupos de pinos: até este zoom (exclusivo) os pinos perto viram uma bolinha com o número.
  const ZOOM_SEM_GRUPOS = -1.25;
  const CELULA_GRUPO = 56; // px da grade do agrupamento
  // Até quanto (px) um nome de região/cidade pode subir ou descer para sair de baixo de
  // uma bolinha de grupo ou de um pino (no celular a bolinha cobria o nome grande).
  const DESLOCAMENTO_MAX = 64;

  function criarEl(tag, classe, texto) {
    const n = document.createElement(tag);
    n.className = classe;
    if (texto != null) n.textContent = String(texto);
    return n;
  }
  const encosta = (a, b) =>
    a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

  // ---------- Nomes por zoom ----------
  // lugares: [{nome, x, y, nivel, tipo, apelido_de}] em pixels do pôster; opcoes.paraLatLng converte.
  // opcoes.obstaculos: () => [{x1,y1,x2,y2,grupo}] (px do mapa) que os nomes devem evitar
  // (grupos e pinos; grupo: true = bolinha com número, que nunca pode cobrir o nome).
  function criarNomes(L, mapa, lugares, opcoes) {
    const op = Object.assign(
      {
        faixas: FAIXAS_ZOOM,
        paraLatLng: (l) => [-l.y, l.x],
        pane: "nomesGTA",
        obstaculos: null,
      },
      opcoes,
    );
    if (!mapa.getPane(op.pane)) {
      const p = mapa.createPane(op.pane);
      p.style.zIndex = 450; // acima do fundo, abaixo dos pinos (600)
      p.style.pointerEvents = "none";
    }
    const PRIORIDADE = { regiao: 0, agua: 1, condado: 2 };
    const itens = lugares
      .filter((l) => l.nivel && !l.apelido_de && isFinite(l.x) && isFinite(l.y))
      .map((l, i) => {
        const tipo = String(l.tipo || "lugar").replace(/[^a-z]/g, "");
        const nivel = Number(l.nivel) || 3;
        const m = L.marker(op.paraLatLng(l), {
          pane: op.pane,
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: "nome-gta-wrap",
            html: criarEl(
              "span",
              `nome-gta nome-n${nivel} nome-${tipo}`,
              l.nome,
            ),
            iconSize: null,
            iconAnchor: [0, 0],
          }),
        }).addTo(mapa);
        return {
          l,
          m,
          el: () => m.getElement() && m.getElement().firstChild,
          ordem: nivel * 10 + (PRIORIDADE[tipo] ?? 5) + i / 1000,
        };
      })
      .sort((a, b) => a.ordem - b.ordem);

    function naFaixa(nivel, z) {
      const f = op.faixas[nivel];
      return f && z >= f[0] - 1e-9 && z < f[1] - 1e-9;
    }
    // Camada de cima (acima dos pinos) para o nome que não tem como sair de baixo de um grupo.
    const paneCima = op.pane + "Cima";
    if (!mapa.getPane(paneCima)) {
      const p = mapa.createPane(paneCima);
      p.style.zIndex = 640; // acima dos pinos (600), abaixo das dicas/popups (650+)
      p.style.pointerEvents = "none";
    }

    // Mostra os nomes da faixa do zoom; se dois se encostam, fica o mais importante.
    // Nome de região/cidade (nível 1 e 2) embaixo de um grupo ou pino:
    //  1) desliza (cima/baixo/lado, só o necessário, até DESLOCAMENTO_MAX) para um lugar livre;
    //  2) se não há lugar livre de grupos, fica onde está mas POR CIMA dos pinos, com fundo escuro.
    function atualizar() {
      const z = mapa.getZoom();
      const tela = mapa.getSize();
      const ocupado = [];
      const obst =
        typeof op.obstaculos === "function" ? op.obstaculos() || [] : [];
      const grupos = obst.filter((o) => o.grupo);
      for (const it of itens) {
        const el = it.el();
        if (!el) continue;
        let mostrar = naFaixa(it.l.nivel, z);
        let dx = 0,
          dy = 0,
          porCima = false;
        if (mostrar) {
          const pt = mapa.latLngToContainerPoint(it.m.getLatLng());
          const w = el.offsetWidth,
            h = el.offsetHeight;
          const caixa = (a, b) => ({
            x1: pt.x + a - w / 2 - 4,
            y1: pt.y + b - h / 2 - 2,
            x2: pt.x + a + w / 2 + 4,
            y2: pt.y + b + h / 2 + 2,
          });
          let r = caixa(0, 0);
          const foraDaTela =
            r.x2 < -200 ||
            r.y2 < -200 ||
            r.x1 > tela.x + 200 ||
            r.y1 > tela.y + 200;
          if (!foraDaTela) {
            const livre = (c, lista) =>
              !lista.some((o) => encosta(c, o)) &&
              !ocupado.some((o) => encosta(c, o));
            if (it.l.nivel <= 2 && obst.some((o) => encosta(r, o))) {
              // posições candidatas: encostar em cada borda de cada obstáculo próximo
              const cand = [];
              for (const o of obst) {
                if (
                  o.x2 < r.x1 - DESLOCAMENTO_MAX ||
                  o.x1 > r.x2 + DESLOCAMENTO_MAX ||
                  o.y2 < r.y1 - DESLOCAMENTO_MAX ||
                  o.y1 > r.y2 + DESLOCAMENTO_MAX
                )
                  continue;
                cand.push(
                  [0, o.y1 - r.y2 - 1],
                  [0, o.y2 - r.y1 + 1],
                  [o.x1 - r.x2 - 1, 0],
                  [o.x2 - r.x1 + 1, 0],
                );
              }
              const perto = cand
                .filter(
                  ([a, b]) =>
                    Math.abs(a) <= DESLOCAMENTO_MAX &&
                    Math.abs(b) <= DESLOCAMENTO_MAX,
                )
                // andar de lado "custa" mais que subir/descer (o nome fica longe do lugar)
                .sort(
                  (u, v) =>
                    Math.abs(u[0]) * 1.5 + Math.abs(u[1]) -
                    (Math.abs(v[0]) * 1.5 + Math.abs(v[1])),
                );
              const escolha =
                perto.find(([a, b]) => livre(caixa(a, b), obst)) ||
                (livre(r, grupos)
                  ? [0, 0]
                  : perto.find(([a, b]) => livre(caixa(a, b), grupos)));
              if (escolha) {
                [dx, dy] = escolha.map(Math.round);
                r = caixa(dx, dy);
              } else porCima = grupos.some((o) => encosta(r, o));
            }
            if (ocupado.some((o) => encosta(r, o))) mostrar = false;
            else ocupado.push(r);
          }
        }
        for (const [k, v] of [
          ["--dx", dx],
          ["--dy", dy],
        ]) {
          const txt = v ? v + "px" : "";
          if (el.style.getPropertyValue(k) !== txt) {
            if (v) el.style.setProperty(k, txt);
            else el.style.removeProperty(k);
          }
        }
        el.classList.toggle("por-cima", mostrar && porCima);
        const wrap = el.parentNode;
        const destino = mapa.getPane(mostrar && porCima ? paneCima : op.pane);
        if (wrap && wrap.parentNode !== destino) destino.appendChild(wrap);
        el.classList.toggle("visivel", mostrar);
      }
    }
    mapa.on("zoomend moveend resize", atualizar);
    // as fontes podem chegar depois: mede de novo
    if (document.fonts && document.fonts.ready)
      document.fonts.ready.then(atualizar);
    requestAnimationFrame(atualizar);
    return { atualizar, faixas: op.faixas };
  }

  // ---------- Agrupamento em grade ----------
  // itens: [{id, marcador (L.Marker), latlng, cor, pego, fixo}] — só os que devem aparecer.
  // "fixo" (selecionado, próximo alvo) nunca entra em grupo.
  function criarAgrupamento(L, mapa, opcoes) {
    const op = Object.assign(
      {
        zoomSemGrupos: ZOOM_SEM_GRUPOS,
        celula: CELULA_GRUPO,
        corMarca: "#ff2e88",
      },
      opcoes,
    );
    let itens = [];
    const naTela = new Set(); // marcadores de ponto que estão no mapa
    let grupos = []; // marcadores de grupo no mapa
    const ouvintes = []; // avisados depois de cada recálculo (ex.: nomes que desviam dos grupos)

    function definir(lista) {
      itens = lista;
      recalcular();
    }

    // Tela estreita (celular) e mapa bem de longe: bolinha menor, cobre menos os nomes de região.
    function iconeGrupo(membros) {
      const n = membros.length;
      const todosPegos = membros.every((x) => x.pego);
      const pequena = mapa.getSize().x < 600 && mapa.getZoom() < -2.5;
      const tam = pequena
        ? n < 5
          ? 28
          : n < 15
            ? 32
            : 36
        : n < 5
          ? 34
          : n < 15
            ? 40
            : 46;
      const bola = criarEl(
        "span",
        "grupo-gta" + (todosPegos ? " pego" : "") + (pequena ? " pequeno" : ""),
      );
      bola.style.setProperty("--cor", op.corMarca);
      bola.style.width = tam + "px";
      bola.style.height = tam + "px";
      bola.append(criarEl("span", "grupo-gta-n", n));
      return L.divIcon({
        className: "grupo-gta-wrap",
        html: bola,
        iconSize: [tam, tam],
        iconAnchor: [tam / 2, tam / 2],
      });
    }

    function aproximarGrupo(membros) {
      const b = L.latLngBounds(membros.map((x) => x.latlng));
      const z = mapa.getZoom();
      let alvo = mapa.getBoundsZoom(b.pad(0.35));
      alvo = Math.min(mapa.getMaxZoom(), Math.max(alvo, z + 1));
      mapa.flyTo(b.getCenter(), alvo, { duration: 0.55 });
    }

    function recalcular() {
      const z = mapa.getZoom();
      const agrupar = z < op.zoomSemGrupos;
      const soltos = [];
      const celulas = new Map();
      for (const it of itens) {
        if (!agrupar || it.fixo) {
          soltos.push(it);
          continue;
        }
        const p = mapa.project(it.latlng, z);
        const k =
          Math.floor(p.x / op.celula) + ":" + Math.floor(p.y / op.celula);
        if (!celulas.has(k)) celulas.set(k, []);
        celulas.get(k).push(it);
      }
      // junta células vizinhas cujos centros ficaram encostados (a grade sozinha deixa
      // dois grupos lado a lado quando os pontos caem na divisa)
      const blocos = [...celulas.values()].map((membros) => {
        const c = membros.reduce(
          (s, x) => s.add(mapa.project(x.latlng, z)),
          L.point(0, 0),
        );
        return { membros, c: c.divideBy(membros.length) };
      });
      const perto = op.celula * 0.8;
      for (let juntou = true; juntou;) {
        juntou = false;
        for (let i = 0; i < blocos.length && !juntou; i++)
          for (let j = i + 1; j < blocos.length; j++) {
            const a = blocos[i],
              b = blocos[j];
            if (a.c.distanceTo(b.c) < perto) {
              const n = a.membros.length + b.membros.length;
              a.c = a.c
                .multiplyBy(a.membros.length)
                .add(b.c.multiplyBy(b.membros.length))
                .divideBy(n);
              a.membros = a.membros.concat(b.membros);
              blocos.splice(j, 1);
              juntou = true;
              break;
            }
          }
      }
      const novosGrupos = [];
      for (const { membros } of blocos) {
        if (membros.length === 1) soltos.push(membros[0]);
        else novosGrupos.push(membros);
      }
      // pinos soltos: põe/tira do mapa só o que mudou (sem piscar)
      const querer = new Set(soltos.map((x) => x.marcador));
      for (const m of naTela)
        if (!querer.has(m)) {
          m.remove();
          naTela.delete(m);
        }
      for (const m of querer)
        if (!naTela.has(m)) {
          m.addTo(mapa);
          naTela.add(m);
        }
      // grupos: refeitos a cada zoom (são poucos)
      grupos.forEach((g) => g.remove());
      grupos = novosGrupos.map((membros) => {
        let la = 0,
          ln = 0;
        membros.forEach((x) => {
          la += x.latlng.lat;
          ln += x.latlng.lng;
        });
        const g = L.marker([la / membros.length, ln / membros.length], {
          icon: iconeGrupo(membros),
          keyboard: true, // Tab chega nele; Enter aproxima
          title: `${membros.length} pontos aqui. Clique ou Enter para aproximar.`,
          alt: `${membros.length} pontos`,
          riseOnHover: true,
          zIndexOffset: 200,
        });
        g.on("click", () => aproximarGrupo(membros));
        // o Leaflet não transforma Enter em clique: fazemos aqui (acessível pelo teclado)
        g.on("keypress", (e) => {
          const k = e.originalEvent;
          if (k && (k.key === "Enter" || k.keyCode === 13))
            aproximarGrupo(membros);
        });
        g.on("add", () => {
          const el = g.getElement();
          if (el) el.setAttribute("role", "button");
        });
        return g.addTo(mapa);
      });
      ouvintes.forEach((f) => f());
    }

    // Retângulos (px do mapa) dos grupos e pinos soltos na tela: o que os nomes devem evitar.
    function retangulos() {
      const caixa = mapa.getContainer().getBoundingClientRect();
      const saida = [];
      for (const m of [...grupos, ...naTela]) {
        const e = m.getElement && m.getElement();
        if (!e) continue;
        const r = e.getBoundingClientRect();
        if (!r.width) continue;
        saida.push({
          grupo: grupos.includes(m),
          x1: r.left - caixa.left,
          y1: r.top - caixa.top,
          x2: r.right - caixa.left,
          y2: r.bottom - caixa.top,
        });
      }
      return saida;
    }

    // Diz se o ponto está aparecendo solto (fora de grupo). O selecionado e o alvo vão como "fixo" e nunca entram em grupo.
    function estaSolto(id) {
      const it = itens.find((x) => x.id === id);
      return !!it && naTela.has(it.marcador);
    }

    mapa.on("zoomend", recalcular);
    return {
      definir,
      recalcular,
      estaSolto,
      retangulos,
      aoMudar: (f) => ouvintes.push(f),
      grupos: () => grupos.slice(),
    };
  }

  // ---------- Destaque do ponto aberto ----------
  // Põe o ponto no meio da parte do mapa que o painel NÃO cobre: à esquerda do painel no PC,
  // acima da folha de baixo no celular (mesmo quando a folha é alta).
  // opcoes: {zoom, painel (elemento), duracao}
  function deslocamentoPainel(mapa, painel) {
    const tam = mapa.getSize();
    let dx = 0,
      dy = 0;
    if (painel && !painel.hidden) {
      const caixaMapa = mapa.getContainer().getBoundingClientRect();
      const r = painel.getBoundingClientRect();
      if (r.width && r.height) {
        const cobreDireita = Math.max(0, caixaMapa.right - r.left);
        const cobreBaixo = Math.max(0, caixaMapa.bottom - r.top);
        // painel ao lado (cobre a direita do mapa) ou embaixo (folha do celular)
        if (r.width < caixaMapa.width * 0.8 && cobreDireita > 0)
          dx = Math.min(cobreDireita, tam.x - 60) / 2;
        else if (cobreBaixo > 0) dy = Math.min(cobreBaixo, tam.y - 56) / 2;
      }
    }
    return L.point(dx, dy);
  }

  // Ponto perto da borda do pôster: o limite de arrasto (maxBounds) não deixaria pôr o ponto
  // acima da folha / ao lado do painel. Enquanto há ponto aberto, o limite cresce só o
  // necessário; ao fechar (destacar(mapa, false)) volta o original e o mapa desliza de volta.
  function soltarLimites(L, mapa, centro, z) {
    if (!("_limitesGTA" in mapa)) {
      if (!mapa.options.maxBounds) return;
      mapa._limitesGTA = mapa.options.maxBounds;
    }
    const orig = mapa._limitesGTA;
    const c = mapa.project(centro, z);
    const meio = mapa.getSize().divideBy(2);
    mapa.setMaxBounds(
      L.latLngBounds(orig.getSouthWest(), orig.getNorthEast())
        .extend(mapa.unproject(c.subtract(meio), z))
        .extend(mapa.unproject(c.add(meio), z)),
    );
  }
  function prenderLimites(mapa) {
    if (!("_limitesGTA" in mapa)) return;
    const orig = mapa._limitesGTA;
    delete mapa._limitesGTA;
    mapa.setMaxBounds(orig);
  }

  function centralizar(L, mapa, latlng, opcoes) {
    const op = Object.assign({ duracao: 0.6 }, opcoes);
    const z = op.zoom == null ? mapa.getZoom() : op.zoom;
    const alvo = mapa
      .project(latlng, z)
      .add(deslocamentoPainel(mapa, op.painel));
    const centro = mapa.unproject(alvo, z);
    soltarLimites(L, mapa, centro, z);
    if (Math.abs(z - mapa.getZoom()) < 0.01)
      mapa.panTo(centro, {
        animate: true,
        duration: op.duracao * 0.8,
        easeLinearity: 0.2,
      });
    else mapa.flyTo(centro, z, { duration: op.duracao });
  }

  // Diz se o ponto está fora da parte livre do mapa (embaixo do painel ou fora da tela).
  function coberto(mapa, latlng, painel, margem) {
    const m = margem == null ? 24 : margem;
    const pt = mapa.latLngToContainerPoint(latlng);
    const tam = mapa.getSize();
    let livreX = tam.x,
      livreY = tam.y;
    const d = deslocamentoPainel(mapa, painel);
    if (d.x) livreX = tam.x - d.x * 2;
    if (d.y) livreY = tam.y - d.y * 2;
    return pt.x < m || pt.y < m || pt.x > livreX - m || pt.y > livreY - m;
  }

  function destacar(mapa, ligado) {
    mapa.getContainer().classList.toggle("tem-selecionado", !!ligado);
    if (!ligado) prenderLimites(mapa);
  }

  window.CamadasGTA = {
    FAIXAS_ZOOM,
    ZOOM_SEM_GRUPOS,
    criarNomes,
    criarAgrupamento,
    centralizar,
    coberto,
    destacar,
  };
})();
