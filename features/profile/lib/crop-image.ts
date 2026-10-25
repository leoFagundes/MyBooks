// Só no navegador: recorta a área escolhida num quadrado e devolve a imagem
// pronta para subir (WebP; o Safari, sem WebP no canvas, devolve PNG)

export type CropArea = { x: number; y: number; width: number; height: number };

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não deu para abrir a imagem"));
    image.src = src;
  });
}

export async function cropToSquare(
  src: string,
  area: CropArea,
  size = 256,
): Promise<Blob> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas indisponível");
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    size,
    size,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Não deu para recortar")),
      "image/webp",
      0.9,
    ),
  );
}

export function extensionFor(type: string) {
  return type === "image/webp" ? "webp" : type === "image/jpeg" ? "jpg" : "png";
}
