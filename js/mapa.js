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

  function criarMapa(elemento, opcoes) {
    const c = window.CONFIG;
    const W = c.MAPA_LARGURA,
      H = c.MAPA_ALTURA;
    const limites = [
      [-H, 0],
      [0, W],
    ];
    const mapa = L.map(elemento, {
      crs: L.CRS.Simple,
      minZoom: -4,
      maxZoom: 1,
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
    const camada = L.imageOverlay(c.MAPA_IMAGEM, limites, {
      alt: "Pôster do mapa de Leonida",
    }).addTo(mapa);
    mapa.fitBounds(limites, { padding: [8, 8] });
    const ajustar = () =>
      elemento.classList.toggle("mapa-longe", mapa.getZoom() < -2);
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
