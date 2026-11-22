// Configuração do site público. Este arquivo vai para a internet junto com o site.
// A chave "anon" do Supabase é PÚBLICA de propósito (quem protege os dados é o RLS do banco).
// NUNCA coloque aqui a chave "service_role" nem nenhuma senha.
window.CONFIG = Object.freeze({
  // true = site de demonstração, com dados de mentira no próprio navegador (sem Supabase).
  // Troque para false depois de configurar o Supabase (veja CONFIGURAR.md).
  MODO_DEMO: false,

  // Supabase > Project Settings > API (ou Data API): "Project URL" e a chave "anon public".
  SUPABASE_URL: "https://klqsnsdhavjslghxeovw.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_DWjRy7pDyAS_9LhLlNEBuQ_5DTovkvf",

  // Imagem do mapa (gerada por ferramentas/preparar-mapa.js; não fica no git deste projeto).
  MAPA_IMAGEM: "img/mapa-leonida.jpg",
  MAPA_LARGURA: 4000,
  MAPA_ALTURA: 5472,

  // Canais do Nauã Pietro (aparecem no topo e no rodapé). Endereço vazio = não aparece.
  CANAIS: [
    { nome: "TikTok", url: "https://www.tiktok.com/@naua.pietro" },
    { nome: "YouTube", url: "" },
    { nome: "Kick", url: "" },
    { nome: "Instagram", url: "" },
    { nome: "Discord", url: "" },
  ],

  // Páginas do menu do topo (para criar uma página nova, só acrescentar uma linha aqui).
  PAGINAS: [
    { nome: "Mapa", url: "index.html" },
    { nome: "Platina", url: "platina.html" },
    { nome: "Regras", url: "regras.html" },
  ],

  // E-mail de contato para assuntos de privacidade (LGPD). Vazio = mostra "pelo Discord da live".
  CONTATO_EMAIL: "",

  // Limites do print (o banco e o Storage conferem de novo; isto é só para avisar antes).
  PRINT_MAX_ENTRADA_MB: 8,
  PRINT_MAX_SAIDA_MB: 2,
  PRINT_MAX_LADO: 1600,
});
