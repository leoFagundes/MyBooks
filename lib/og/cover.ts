import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { OPEN_LIBRARY_COVER_URL } from "@/features/books/lib/cover";
import { OPEN_LIBRARY_USER_AGENT } from "@/features/books/lib/open-library";

/** M nos leques; L na capa grande. */
export type OgCoverSize = "M" | "L";

function coverFile(src: string, size: OgCoverSize) {
  if (OPEN_LIBRARY_COVER_URL.test(src)) {
    return src.replace(/-[SML]\.jpg$/, `-${size}.jpg?default=false`);
  }
  // A pasta do livro no bucket covers
  return `${src}/${size}.webp`;
}

// Um dia de cache por imagem. Falha lança erro, para não ficar guardada
async function fetchImage(url: string): Promise<string> {
  "use cache";
  cacheLife("days");
  cacheTag("imagens-og");
  const response = await fetch(url, {
    headers: { "User-Agent": OPEN_LIBRARY_USER_AGENT },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Imagem indisponível (${response.status})`);
  const type = response.headers.get("content-type") ?? "image/jpeg";
  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:${type};base64,${bytes.toString("base64")}`;
}

/**
 * Uma imagem (avatar, capa) como data URI, para o desenho não depender de
 * outro servidor na hora. Sem imagem, ou se ela não vier em 5s, null.
 */
export async function ogImageData(url: string | null): Promise<string | null> {
  if (!url) return null;
  return fetchImage(url).catch(() => null);
}

/** A capa no tamanho certo; sem capa, null (entra a capa tipográfica). */
export function ogCoverData(src: string | null, size: OgCoverSize) {
  return ogImageData(src ? coverFile(src, size) : null);
}
