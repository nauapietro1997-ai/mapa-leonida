// Escolhe o "banco": demonstração (no navegador) ou Supabase de verdade.
// Uso: const api = await window.prepararApi();
(function () {
  "use strict";
  let promessa = null;

  function carregarScript(src, integridade) {
    return new Promise((ok, falha) => {
      const s = document.createElement("script");
      s.src = src;
      if (integridade) s.integrity = integridade; // se o arquivo for trocado, o navegador recusa
      s.onload = ok;
      s.onerror = () => falha(new Error("Não consegui carregar " + src));
      document.head.append(s);
    });
  }

  window.prepararApi = function () {
    if (promessa) return promessa;
    promessa = (async () => {
      const cfg = window.CONFIG;
      if (cfg.MODO_DEMO) {
        document.documentElement.classList.add("modo-demo");
        return window.criarApiDemo();
      }
      if (
        /SEU-PROJ[E]TO|COLE-AQUI/.test(cfg.SUPABASE_URL + cfg.SUPABASE_ANON_KEY) /* [E]: não confundir com o marcador */
      )
        throw new Error(
          "O site ainda não foi configurado (js/config.js). Veja CONFIGURAR.md.",
        );
      // Biblioteca oficial supabase-js 2.119.0, guardada no próprio site (sem CDN de terceiros).
      await carregarScript(
        "vendor/supabase/supabase-2.119.0.js",
        "sha384-uteMfOloLDGt042uDz+xHGF3ym63/WQ6rFq7murQRG8Ih7QrXGEGNtWd8688sb4O",
      );
      return window.criarApiSupabase();
    })();
    return promessa;
  };
})();
