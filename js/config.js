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

  // Mapa: ladrilhos (tiles) do pôster original 5775x7900, gerados por ../ferramentas/gerar-tiles.py
  // (ou ferramentas/preparar-mapa.js); não ficam no git deste projeto, só na pasta dist/.
  // MAPA_IMAGEM = imagem única de reserva (se os ladrilhos faltarem).
  MAPA_TILES: "img/tiles/{z}/{x}/{y}.webp",
  // Cópia do pôster SEM os nomes pintados: aparece de perto (o nome vem do nosso texto).
  // Faltando a pasta, o site continua só com o original.
  MAPA_TILES_SEM_NOMES: "img/tiles-sem-nomes/{z}/{x}/{y}.webp",
  MAPA_TILES_LARGURA: 5775,
  MAPA_TILES_ALTURA: 7900,
  MAPA_TILES_NIVEL: 5, // nível do tamanho real (0 = 1 ladrilho só)
  MAPA_IMAGEM: "img/mapa-leonida.jpg",
  // Posições (x, y) dos pontos ficam em pixels da cópia 4000x5472 (banco e sugestões); não mudar.
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
