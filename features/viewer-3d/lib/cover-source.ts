import { hashString } from "@/features/books/lib/hash";
import type { BookVisual } from "@/features/books/types";
import imageLoader from "@/lib/image-loader";

const CATALOG_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const WIDTHS = { M: 240, L: 480 } as const;

/**
 * De onde a capa vira textura. Livro do catálogo: pela rota da mesma origem
 * (`/api/books/[id]/cover`), sem depender do CORS da Open Library; o `v` muda
 * com a imagem, e o cache dela nunca serve a antiga. A imagem escolhida no
 * cadastro (blob) vai direto; as demonstrações do /dev, que não estão no
 * catálogo, pelo endereço de sempre.
 */
export function coverTextureSource(
  book: BookVisual,
  size: keyof typeof WIDTHS,
): string | null {
  if (!book.coverUrl) return null;
  if (/^(blob|data):/.test(book.coverUrl)) return book.coverUrl;
  if (CATALOG_ID.test(book.id)) {
    const version = hashString(book.coverUrl).toString(36);
    return `/api/books/${book.id}/cover?tamanho=${size}&v=${version}`;
  }
  return imageLoader({ src: book.coverUrl, width: WIDTHS[size] });
}
