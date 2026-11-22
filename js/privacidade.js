// Página de privacidade: botão "Apagar minha conta e dados" (LGPD).
(async function () {
  "use strict";
  const { aviso, textoErro, perguntar } = window.U;
  const $ = (s) => document.querySelector(s);

  // E-mail de contato (config.js > CONTATO_EMAIL). Vazio = fica o texto do Discord.
  const email = String(window.CONFIG.CONTATO_EMAIL || "").trim();
  if (
    /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,180}\.[A-Za-z]{2,24}$/.test(email)
  ) {
    const link = document.createElement("a");
    link.setAttribute("href", "mailto:" + email);
    link.textContent = email;
    const caixa = $("#contato-privacidade");
    caixa.textContent = "escreva para ";
    caixa.append(link);
  }
  let api;
  try {
    api = await window.prepararApi();
  } catch (e) {
    $("#apagar-texto").textContent = textoErro(e);
    return;
  }
  const btn = $("#btn-apagar-conta");

  await window.Conta.iniciar(api, (p) => {
    btn.hidden = !p;
    $("#apagar-texto").textContent = p
      ? "Você está conectado como " + p.nome + "."
      : "Entre com o Discord para apagar sua conta.";
  });

  btn.addEventListener("click", async () => {
    const ok = await perguntar({
      titulo: "Apagar tudo?",
      texto:
        "Seu perfil, sugestões, denúncias e prints serão apagados para sempre. Não dá para desfazer.",
      confirmar: "Sim, apagar tudo",
      perigo: true,
    });
    if (!ok) return;
    btn.disabled = true;
    btn.textContent = "Apagando…";
    try {
      await api.apagarConta();
      aviso("Sua conta e seus dados foram apagados.");
      btn.hidden = true;
      $("#apagar-texto").textContent =
        "Conta apagada. Obrigado por ter ajudado o mapa!";
    } catch (e) {
      aviso(textoErro(e), "erro");
      btn.disabled = false;
      btn.textContent = "Apagar minha conta e dados";
    }
  });
  document.documentElement.dataset.pronto = "1";
})();
