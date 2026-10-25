import { formatNumber } from "@/lib/format";
import type { CollectionVisual } from "../types";

/** "8 livros · 34 curtidas", "1 livro" ou "Nenhum livro ainda". */
export function collectionCounts({
  bookCount,
  likeCount,
}: Pick<CollectionVisual, "bookCount" | "likeCount">) {
  const books =
    bookCount === 0
      ? "Nenhum livro ainda"
      : `${formatNumber(bookCount)} ${bookCount === 1 ? "livro" : "livros"}`;
  if (likeCount === 0) return books;
  return `${books} · ${formatNumber(likeCount)} ${likeCount === 1 ? "curtida" : "curtidas"}`;
}
