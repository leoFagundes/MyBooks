import { genreLabel } from "@/features/profile/genres";
import type { BookVisual } from "@/features/books/types";

/** Um livro do sorteio: com os gêneros do catálogo, quando vieram. */
export type DrawBook = BookVisual & { genres?: string[] };

export type DrawGenre = { slug: string; label: string; count: number };

/** Os gêneros da fila do sorteio, do mais frequente ao menos, com a contagem. */
export function drawGenres(books: readonly DrawBook[]): DrawGenre[] {
  const counts = new Map<string, number>();
  for (const book of books) {
    for (const slug of new Set(book.genres ?? [])) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }
  return [...counts]
    .flatMap(([slug, count]) => {
      const label = genreLabel(slug);
      return label ? [{ slug, label, count }] : [];
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt"));
}

/** Os livros com algum dos gêneros escolhidos; sem escolha, todos. */
export function filterByGenres<T extends DrawBook>(
  books: readonly T[],
  selected: readonly string[],
): T[] {
  if (selected.length === 0) return [...books];
  return books.filter((book) =>
    (book.genres ?? []).some((slug) => selected.includes(slug)),
  );
}
