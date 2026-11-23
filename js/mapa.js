// Mapa (Leaflet) usado na página principal e no mini mapa da moderação.
// Pinos montados como elementos (sem HTML em texto), para respeitar a CSP.
(function () {
  "use strict";
  const { CATEGORIAS, el, iconeCategoria } = window.U;

  function paraLatLng(x, y) {
    return [-y, x];
  }
  function deLatLng(ll) {
    const c = window.CONFIG;
    return {
      x: Math.min(c.MAPA_LARGURA, Math.max(0, Math.round(ll.lng))),
      y: Math.min(c.MAPA_ALTURA, Math.max(0, Math.round(-ll.lat))),
    };
  }

  // Os pontos ficam em pixels 4000x5472; os ladrilhos vêm do pôster 5775x7900.
  // Este sistema de coordenadas estica um sobre o outro (pinos no mesmo lugar do pôster).
  // Zoom 0 = pôster no tamanho real; ZOOM_MAX 0.5 = no máximo 1,4x (nunca pixelado).
  // (Antes, com a imagem única, os zooms eram ~0,5 maiores: -1 de antes = -1.5 agora.)
  const ZOOM_MIN = -4.5;
  // Com o nível 6 (pôster ampliado 2x com IA) dá para aproximar mais: zoom 1 = nível 6 no tamanho real.
  const EXTRA = () => !!(window.CONFIG && window.CONFIG.MAPA_TILES_NIVEL_EXTRA);
  const ZOOM_MAX = EXTRA() ? 1 : 0.5; // zoom 1 = nível 6 em tamanho real (o fundo da IA fica mole se esticar mais)
  function crsMapa(c) {
    return L.extend({}, L.CRS.Simple, {
      transformation: new L.Transformation(
        c.MAPA_TILES_LARGURA / c.MAPA_LARGURA,
        0,
        -c.MAPA_TILES_ALTURA / c.MAPA_ALTURA,
        0,
      ),
    });
  }

  // Fundo em ladrilhos; se eles faltarem, usa a imagem única (MAPA_IMAGEM).
  // Devolve um objeto que dispara "error" se nem a reserva carregar.
  function camadaMapa(mapa, c, limites) {
    const avisos = new L.Evented();
    const n = c.MAPA_TILES_NIVEL;
    const opcoesTiles = {
      tileSize: 256,
      zoomOffset: n,
      minZoom: -n - 5,
      minNativeZoom: -n,
      maxNativeZoom: EXTRA() ? 1 : 0,
      maxZoom: 5,
      noWrap: true,
      bounds: L.latLngBounds(limites),
      keepBuffer: 4,
    };
    const tiles = L.tileLayer(c.MAPA_TILES, opcoesTiles);
    avisos.opcoesTiles = opcoesTiles; // para a camada sem nomes usar as mesmas
    let erros = 0,
      carregados = 0,
      trocou = false;
    function usarReserva() {
      if (trocou) return;
      trocou = true;
      tiles.remove();
      avisos.fire("reserva");
      const img = L.imageOverlay(c.MAPA_IMAGEM, limites, {
        alt: "Pôster do mapa de Leonida",
      }).addTo(mapa);
      img.on("error", () => avisos.fire("error"));
    }
    tiles.on("tileload", () => carregados++);
    tiles.on("tileerror", () => {
      erros++;
      if ((carregados === 0 && erros >= 2) || erros >= 6) usarReserva();
    });
    tiles.addTo(mapa);
    return avisos;
  }

  function criarMapa(elemento, opcoes) {
    const c = window.CONFIG;
    const W = c.MAPA_LARGURA,
      H = c.MAPA_ALTURA;
    const limites = [
      [-H, 0],
      [0, W],
    ];
    const mapa = L.map(elemento, {
      crs: crsMapa(c),
      minZoom: ZOOM_MIN,
      maxZoom: ZOOM_MAX,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      maxBounds: [
        [-H - 600, -600],
        [600, W + 600],
      ],
      maxBoundsViscosity: 0.8,
      attributionControl: !(opcoes && opcoes.mini),
      ...(opcoes || {}),
    });
    if (mapa.attributionControl)
      mapa.attributionControl
        .setPrefix(false)
        .addAttribution(
          "Fan site não oficial · GTA e Leonida são marcas da Rockstar Games",
        );
    const camada = camadaMapa(mapa, c, limites);
    mapa.fitBounds(limites, { padding: [8, 8] });
    const ajustar = () =>
      elemento.classList.toggle("mapa-longe", mapa.getZoom() < -2.5);
    mapa.on("zoomend", ajustar);
    ajustar();
    return { mapa, camada, limites };
  }

  // Pino = ícone gerado da categoria (assets/icones). Sem o arquivo, vira o círculo com emoji.
  function iconePino(categoria, extra, subtipo) {
    const cat = CATEGORIAS[categoria] || CATEGORIAS.misterios;
    const pino = el("span", { class: "pino " + (extra || ""), cor: cat.cor }, iconeCategoria(categoria, subtipo, "pino-ic"));
    return L.divIcon({ className: "pino-wrap", html: pino, iconSize: [40, 40], iconAnchor: [20, 20] });
  }

  function iconeNovo() {
    const pino = el(
      "span",
      { class: "pino pino-novo" },
      el("span", { class: "pino-ic", "aria-hidden": "true", text: "+" }),
    );
    return L.divIcon({
      className: "pino-wrap",
      html: pino,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }

  window.Mapa = { criarMapa, iconePino, iconeNovo, paraLatLng, deLatLng };
})();
