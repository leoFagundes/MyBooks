// A imagem da capa escolhida no cadastro é reduzida no navegador antes de
// subir: o servidor recebe no máximo uns 300 KB (a Server Action aceita 3 MB)
// e a refaz em três larguras de qualquer jeito.

/** Lado maior da imagem que sobe: o dobro da maior capa do app (L, 480px). */
const MAX_SIDE = 1200;
/** Foto de câmera ainda grande demais para decodificar no celular. */
export const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024;
const QUALITY = 0.86;

function toBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, QUALITY),
  );
}

/**
 * A imagem com o lado maior em 1200px, em WebP (ou JPEG, no navegador que
 * não gera WebP). Null quando o navegador não consegue ler o arquivo.
 */
export async function shrinkImage(file: File): Promise<File | null> {
  if (file.size > MAX_ORIGINAL_BYTES) return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Sem WebP, o navegador devolve PNG, que fica pesado: vai em JPEG
  let blob = await toBlob(canvas, "image/webp");
  if (blob?.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg");
  if (!blob) return null;
  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `capa.${extension}`, { type: blob.type });
}
