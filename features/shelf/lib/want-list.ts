import type { BookVisual } from "@/features/books/types";

/** A fila de Quero ler no React Query (o sorteio pelo ⌘K). */
export const WANT_LIST_KEY = ["fila-quero-ler"] as const;

export async function fetchWantList(
  signal: AbortSignal,
): Promise<BookVisual[]> {
  const response = await fetch("/api/shelf/want", { signal });
  if (!response.ok) throw new Error(`Fila falhou (${response.status})`);
  const { books } = (await response.json()) as { books: BookVisual[] };
  return books;
}
