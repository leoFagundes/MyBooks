import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeCover, storeCover } from "./catalog";
import { bucketCoverFolder } from "./cover";
import { processCover } from "./cover-pipeline";

/** O navegador já manda a imagem reduzida (lado maior de 1200px): sobra folga. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** A capa enviada, já no bucket: o cover_url do livro e a cor tirada dela. */
export type UploadedCover = { coverUrl: string; color: string | null };

/**
 * A imagem que quem cadastra enviou vira as três larguras em WebP, numa pasta
 * nova (covers/<id>/<versão>/), e dá a cor do livro. O sharp relê a imagem
 * do zero: o que chega do cliente nunca vai direto para o bucket. Arquivo
 * grande demais, de outro tipo ou que não é imagem: null.
 */
export async function storeUploadedCover(
  bookId: string,
  image: Blob,
): Promise<UploadedCover | null> {
  if (
    image.size === 0 ||
    image.size > MAX_UPLOAD_BYTES ||
    !UPLOAD_TYPES.has(image.type)
  ) {
    return null;
  }
  const cover = await processCover(Buffer.from(await image.arrayBuffer()));
  if (!cover) return null;
  // Oito caracteres em [0-9a-f], como o check books_cover_source pede
  const folder = `${bookId}/${randomBytes(4).toString("hex")}`;
  const stored = await storeCover(createAdminClient(), folder, cover);
  return stored ? { coverUrl: `covers/${folder}`, color: cover.color } : null;
}

/** Apaga do bucket a imagem que saiu do livro (trocada ou tirada). */
export async function removeUploadedCover(bookId: string, coverUrl: string) {
  const folder = bucketCoverFolder(bookId, coverUrl);
  if (folder) await removeCover(createAdminClient(), folder);
}
