"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { normalizeQuery } from "@/features/books/lib/search-query";
import {
  dedupeResults,
  type SearchResult,
} from "@/features/books/lib/search-result";
import { useDebouncedValue } from "@/lib/use-debounced-value";

type Scope = "catalog" | "external";

async function fetchResults(
  query: string,
  scope: Scope,
  signal: AbortSignal,
): Promise<SearchResult[]> {
  const response = await fetch(
    `/api/books/search?q=${encodeURIComponent(query)}&scope=${scope}`,
    { signal },
  );
  if (!response.ok) throw new Error(`Busca falhou (${response.status})`);
  const { results } = (await response.json()) as { results: SearchResult[] };
  return results;
}

/**
 * Busca da paleta: o catálogo responde na hora e a Open Library chega depois.
 * Enquanto digita, o catálogo mantém os resultados anteriores; os de fora só
 * aparecem quando são da busca atual (os antigos ficariam lá por segundos).
 */
export function useBookSearch(raw: string) {
  const query = useDebouncedValue(normalizeQuery(raw), 200);
  const enabled = query.length >= 2;
  const catalog = useQuery({
    queryKey: ["busca-livros", query, "catalog"],
    queryFn: ({ signal }) => fetchResults(query, "catalog", signal),
    enabled,
    placeholderData: keepPreviousData,
  });
  const external = useQuery({
    queryKey: ["busca-livros", query, "external"],
    queryFn: ({ signal }) => fetchResults(query, "external", signal),
    enabled,
    // O servidor já espera a Open Library e tenta o Google
    retry: false,
  });

  if (!enabled) {
    return {
      query,
      idle: true,
      results: [],
      catalogPending: false,
      externalPending: false,
      externalFailed: false,
    } as const;
  }
  return {
    query,
    idle: false,
    results: dedupeResults([...(catalog.data ?? []), ...(external.data ?? [])]),
    catalogPending: catalog.isPending,
    externalPending: external.isPending,
    externalFailed: external.isError,
  } as const;
}
