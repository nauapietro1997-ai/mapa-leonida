// Botão "Entrar com Discord", menu da conta e "Sair". Igual em todas as páginas.
(function () {
  "use strict";
  const { el, limpar, aviso, textoErro } = window.U;
  const $ = (s) => document.querySelector(s);

  // No modo demonstração não há Discord: escolhe-se um papel de mentira.
  function escolherPapelDemo() {
    return new Promise((resolve) => {
      const opcao = (valor, titulo, texto) =>
        el(
          "button",
          { type: "submit", class: "opcao-papel", value: valor },
          el("strong", { text: titulo }),
          el("span", { text: texto }),
        );
      const dlg = el(
        "dialog",
        { class: "dialogo" },
        el(
          "form",
          { method: "dialog", class: "dialogo-corpo" },
          el("h2", { class: "dialogo-titulo", text: "Entrar (demonstração)" }),
          el("p", {
            class: "dialogo-texto",
            text: "No site de verdade isto abre o login do Discord. Aqui, escolha como quer testar:",
          }),
          el(
            "div",
            { class: "opcoes-papel" },
            opcao("usuario", "Jogador", "Sugere lugares e denuncia"),
            opcao("moderador", "Moderadora", "Aprova e recusa sugestões"),
            opcao("dono", "Dono", "Tudo, mais papéis, banimentos e ofertas"),
          ),
          el(
            "div",
            { class: "dialogo-acoes" },
            el("button", {
              type: "submit",
              class: "btn btn-fantasma",
              value: "",
              text: "Cancelar",
            }),
          ),
        ),
      );
      dlg.addEventListener("close", () => {
        resolve(dlg.returnValue || null);
        dlg.remove();
      });
      document.body.append(dlg);
      dlg.showModal();
    });
  }

  function desenharAvatar(alvo, perfil) {
    limpar(alvo);
    const src = perfil && window.U.imagemSegura(perfil.avatar || "");
    if (src)
      alvo.append(
        el("img", {
          src,
          alt: "",
          width: 28,
          height: 28,
          referrerpolicy: "no-referrer",
        }),
      );
    else
      alvo.textContent = ((perfil && perfil.nome) || "?")
        .trim()
        .charAt(0)
        .toUpperCase();
  }

  window.Conta = {
    async iniciar(api, aoMudar) {
      const btnEntrar = $("#btn-entrar");
      const logado = $("#conta-logado");
      const btnConta = $("#btn-conta");
      const menu = $("#menu-conta");

      function mostrar(perfil) {
        btnEntrar.hidden = !!perfil;
        logado.hidden = !perfil;
        if (perfil) {
          $("#conta-nome").textContent = perfil.nome;
          desenharAvatar($("#conta-avatar"), perfil);
          const mod =
            !perfil.banido &&
            (perfil.papel === "dono" || perfil.papel === "moderador");
          const linkMod = $("#menu-moderacao");
          if (linkMod) linkMod.hidden = !mod;
        }
        fecharMenu();
        if (aoMudar) aoMudar(perfil);
      }
      function fecharMenu() {
        if (!menu) return;
        menu.hidden = true;
        btnConta.setAttribute("aria-expanded", "false");
      }

      btnEntrar.addEventListener("click", async () => {
        try {
          if (api.demo) {
            const papel = await escolherPapelDemo();
            if (papel) await api.entrar(papel);
          } else {
            btnEntrar.disabled = true;
            btnEntrar.textContent = "Abrindo o Discord…";
            await api.entrar();
          }
        } catch (e) {
          btnEntrar.disabled = false;
          btnEntrar.textContent = "Entrar com Discord";
          aviso(textoErro(e), "erro");
        }
      });
      btnConta.addEventListener("click", () => {
        const abrir = menu.hidden;
        menu.hidden = !abrir;
        btnConta.setAttribute("aria-expanded", String(abrir));
        if (abrir) menu.querySelector(".menu-item").focus();
      });
      document.addEventListener("click", (ev) => {
        if (!menu.hidden && !ev.target.closest("#conta-logado")) fecharMenu();
      });
      document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape" && !menu.hidden) {
          fecharMenu();
          btnConta.focus();
        }
      });
      $("#menu-sair").addEventListener("click", async () => {
        await api.sair();
        aviso("Você saiu da conta.");
      });

      api.aoMudarSessao(mostrar);
      const perfil = await api.iniciar();
      mostrar(perfil);
      return perfil;
    },
  };
})();
