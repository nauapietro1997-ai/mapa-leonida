// Abertura "trailer" da página Platina: cartões de título em tela cheia antes da capa.
// Carregado SEM defer no <head>: decide antes da 1ª pintura se a abertura toca.
// Toca 1 vez por visita (sessionStorage), nunca com link #trofeu-N, página já rolada,
// voltar/avançar do navegador ou "menos movimento". Clique, tecla, roda ou toque pulam.
// Nunca trava a rolagem. No fim (ou ao pular) dispara "pl:abertura-fim" e tira a película.
(function () {
  "use strict";
  var h = document.documentElement;
  var CHAVE = "platina-abertura-v1";

  function vaiTocar() {
    try {
      if (/^#trofeu-/.test(location.hash)) return false;
      if (window.scrollY > 0) return false;
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return false;
      var nav =
        performance.getEntriesByType &&
        performance.getEntriesByType("navigation")[0];
      if (nav && nav.type === "back_forward") return false;
      // sem sessionStorage não dá para lembrar: melhor não tocar
      if (sessionStorage.getItem(CHAVE)) return false;
      sessionStorage.setItem(CHAVE, "1");
      return true;
    } catch (e) {
      return false;
    }
  }

  if (!vaiTocar()) {
    // não toca: a película nem fica na página
    document.addEventListener("DOMContentLoaded", function () {
      var p = document.getElementById("pl-abertura");
      if (p) p.remove();
    });
    return;
  }

  h.classList.add("pl-abrindo");
  var acabou = false;
  var apertado = false; // dedo/botão do mouse ainda em baixo
  var pelicula = null;
  var reserva = setTimeout(terminar, 2600); // se o animationend não vier

  function terminar() {
    if (acabou) return;
    // o clique que pulou ainda não terminou: espera soltar, senão o "click"
    // cairia num link ou botão da página que estava embaixo da película
    if (apertado) {
      window.addEventListener(
        "pointerup",
        function () {
          setTimeout(terminar, 0);
        },
        { once: true, capture: true },
      );
      window.addEventListener("pointercancel", soltar, {
        once: true,
        capture: true,
      });
      apertado = false;
      return;
    }
    acabou = true;
    clearTimeout(reserva);
    h.classList.add("pl-abertura-fim");
    tirarOuvintes();
    if (pelicula) pelicula.remove();
    document.dispatchEvent(new CustomEvent("pl:abertura-fim"));
  }
  function soltar() {
    setTimeout(terminar, 0);
  }
  function pular() {
    if (acabou || h.classList.contains("pl-pulou")) return;
    h.classList.add("pl-pulou");
    setTimeout(terminar, 180); // a película some em 180 ms
  }
  function apertar() {
    apertado = true;
    pular();
  }
  function largar() {
    apertado = false;
  }
  function tecla(ev) {
    if (/^(Tab|Shift|Control|Alt|Meta|CapsLock)$/.test(ev.key)) return;
    pular();
  }
  var passivo = { passive: true, capture: true };
  function tirarOuvintes() {
    window.removeEventListener("pointerdown", apertar, true);
    window.removeEventListener("pointerup", largar, true);
    window.removeEventListener("wheel", pular, passivo);
    window.removeEventListener("touchstart", pular, passivo);
    window.removeEventListener("keydown", tecla, true);
  }
  window.addEventListener("pointerdown", apertar, true);
  window.addEventListener("pointerup", largar, true);
  window.addEventListener("wheel", pular, passivo);
  window.addEventListener("touchstart", pular, passivo);
  window.addEventListener("keydown", tecla, true);

  document.addEventListener("DOMContentLoaded", function () {
    pelicula = document.getElementById("pl-abertura");
    if (!pelicula) return terminar();
    if (acabou) return pelicula.remove();
    pelicula.addEventListener("animationend", function (ev) {
      if (ev.target === pelicula) terminar();
    });
    var botao = pelicula.querySelector(".pl-pular");
    if (botao) botao.addEventListener("click", pular);
  });
})();
