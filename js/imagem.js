// Prepara o print antes de enviar:
// 1) aceita só JPEG, PNG ou WebP de verdade (confere os primeiros bytes, não só o nome);
// 2) até 8 MB na entrada;
// 3) redesenha num canvas (isso APAGA os dados escondidos da foto: EXIF, GPS, modelo do celular);
// 4) sai em WebP (ou JPEG se o navegador não fizer WebP), no máximo 1600 px e 2 MB.
(function () {
  "use strict";

  async function tipoReal(arquivo) {
    const b = new Uint8Array(await arquivo.slice(0, 12).arrayBuffer());
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
      return "image/png";
    if (
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50
    )
      return "image/webp";
    return null;
  }

  function paraBlob(canvas, tipo, qualidade) {
    return new Promise((ok) => canvas.toBlob(ok, tipo, qualidade));
  }

  async function prepararPrint(arquivo) {
    const cfg = window.CONFIG;
    if (!arquivo) throw new Error("Escolha uma imagem.");
    if (arquivo.size > cfg.PRINT_MAX_ENTRADA_MB * 1024 * 1024)
      throw new Error(
        "A imagem passa de " +
          cfg.PRINT_MAX_ENTRADA_MB +
          " MB. Escolha uma menor.",
      );
    const tipo = await tipoReal(arquivo);
    if (!tipo) throw new Error("Só aceito print em JPG, PNG ou WebP.");

    let bitmap;
    try {
      bitmap = await createImageBitmap(arquivo, {
        imageOrientation: "from-image",
      });
    } catch (e) {
      throw new Error(
        "Não consegui abrir essa imagem. Ela pode estar corrompida.",
      );
    }
    const escala = Math.min(
      1,
      cfg.PRINT_MAX_LADO / Math.max(bitmap.width, bitmap.height),
    );
    const w = Math.max(1, Math.round(bitmap.width * escala));
    const h = Math.max(1, Math.round(bitmap.height * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h); // PNG transparente vira fundo preto (JPEG não tem transparência)
    ctx.drawImage(bitmap, 0, 0, w, h);
    if (bitmap.close) bitmap.close();

    const limite = cfg.PRINT_MAX_SAIDA_MB * 1024 * 1024;
    for (const q of [0.85, 0.75, 0.65, 0.5, 0.4]) {
      let blob = await paraBlob(canvas, "image/webp", q);
      let ext = "webp";
      if (!blob || blob.type !== "image/webp") {
        blob = await paraBlob(canvas, "image/jpeg", q);
        ext = "jpg";
      }
      if (blob && blob.size <= limite)
        return { blob, ext, largura: w, altura: h };
    }
    throw new Error(
      "Não consegui deixar o print com menos de 2 MB. Tente cortar a imagem.",
    );
  }

  window.prepararPrint = prepararPrint;
})();
