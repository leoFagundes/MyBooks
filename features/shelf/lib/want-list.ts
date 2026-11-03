import type { DrawBook } from "./draw-genres";

/** A fila de Quero ler no React Query (o sorteio pelo ⌘K). */
export const WANT_LIST_KEY = ["fila-quero-ler"] as const;

export async function fetchWantList(signal: AbortSignal): Promise<DrawBook[]> {
  const response = await fetch("/api/shelf/want", { signal });
  if (!response.ok) throw new Error(`Fila falhou (${response.status})`);
  const { books } = (await response.json()) as { books: DrawBook[] };
  return books;
}
