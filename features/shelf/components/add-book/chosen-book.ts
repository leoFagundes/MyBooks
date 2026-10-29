import type { SearchResult } from "@/features/books/lib/search-result";
import type { BookVisual } from "@/features/books/types";
import type { BookRef } from "../../schemas";

/** O livro escolhido: como desenhá-lo e como o servidor o acha. */
export type ChosenBook = { ref: BookRef; visual: BookVisual };

/** Chave estável de um resultado, esteja ele no catálogo ou não. */
export function resultKey(result: SearchResult): string {
  return result.catalogId ?? `${result.source}:${result.sourceId}`;
}

export function resultVisual(result: SearchResult): BookVisual {
  return {
    id: resultKey(result),
    title: result.title,
    authors: result.authors,
    coverUrl: result.coverUrl,
    coverColor: result.coverColor ?? null,
    coverStyle: result.coverStyle ?? "classic",
    pageCount: result.pageCount,
    publishedYear: result.publishedYear,
  };
}

/**
 * Do catálogo, vai o id; de fora, a obra na fonte e a busca que a achou (o
 * servidor refaz essa busca, do cache, e pega os dados de lá).
 */
export function chooseResult(
  result: SearchResult,
  query: string,
): ChosenBook | null {
  const visual = resultVisual(result);
  if (result.catalogId) return { ref: { catalogId: result.catalogId }, visual };
  // Livro manual só existe no catálogo, e então tem catalogId
  if (result.source === "manual") return null;
  return {
    ref: { source: result.source, sourceId: result.sourceId, query },
    visual,
  };
}

/** "Machado de Assis · 1899", a linha embaixo do título. */
export function byline(book: Pick<BookVisual, "authors" | "publishedYear">) {
  return [book.authors.join(", "), book.publishedYear]
    .filter(Boolean)
    .join(" · ");
}
