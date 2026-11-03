"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyShelfIllustration } from "@/components/ui/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { ReturningCover } from "@/features/books/components/returning-cover";
import type { SearchResult } from "@/features/books/lib/search-result";
import { GENRES, type GenreSlug } from "@/features/profile/genres";
import { DISCOVERY_ALL } from "@/features/shelf/schemas";
import { pressScale, springs } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { replaceExploreParams, useExploreSearchParams } from "./explore-url";
import { COVER_GRID, ResultCard } from "./result-card";

type Page = { results: SearchResult[]; next: number | null };

const SEED_KEY = "mybooks:explorar-semente";
let sessionSeed: number | null = null;

// A semente da ordem embaralhada, a mesma a sessão inteira: quem volta ao
// Explorar vê a mesma lista. Sem sessionStorage, vale até recarregar
function readSeed() {
  if (sessionSeed !== null) return sessionSeed;
  try {
    const stored = Number(window.sessionStorage.getItem(SEED_KEY));
    if (Number.isInteger(stored) && stored > 0) sessionSeed = stored;
  } catch {
    // Sem acesso ao armazenamento: a semente fica só na memória
  }
  if (sessionSeed === null) {
    sessionSeed = crypto.getRandomValues(new Uint32Array(1))[0] || 1;
    try {
      window.sessionStorage.setItem(SEED_KEY, String(sessionSeed));
    } catch {
      // Idem
    }
  }
  return sessionSeed;
}

const noSubscription = () => () => {};
const serverSeed = () => null;

async function fetchPage(
  seed: number,
  genre: GenreSlug | null,
  page: number,
  signal: AbortSignal,
): Promise<Page> {
  const params = new URLSearchParams({
    semente: String(seed),
    pagina: String(page),
  });
  if (genre) params.set("genero", genre);
  const response = await fetch(`/api/explore/discover?${params}`, { signal });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as Page;
}

function genreFromUrl(search: string): GenreSlug | null {
  const value = new URLSearchParams(search).get("genero");
  return GENRES.find((genre) => genre.slug === value)?.slug ?? null;
}

/**
 * "Populares e descobertas" (MELHORIAS 5.3): os mais adicionados no MyBooks,
 * as tendências da Open Library e assuntos por gênero, numa ordem
 * embaralhada que não muda na sessão. "Ver mais" traz a próxima página, sem
 * repetir; o gênero escolhido fica na URL (?genero=).
 */
export function DiscoveryGrid() {
  const seed = useSyncExternalStore(noSubscription, readSeed, serverSeed);
  const search = useExploreSearchParams();
  const [picked, setPicked] = useState<GenreSlug | null | undefined>(undefined);
  const genre = picked === undefined ? genreFromUrl(search) : picked;

  const query = useInfiniteQuery({
    queryKey: ["descobertas", seed, genre],
    queryFn: ({ pageParam, signal }) =>
      fetchPage(seed ?? 1, genre, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => last.next ?? undefined,
    enabled: seed !== null,
    staleTime: 5 * 60_000,
  });

  function choose(next: GenreSlug | null) {
    setPicked(next);
    replaceExploreParams({ genero: next });
  }

  return (
    <section aria-labelledby="descobertas" className="flex flex-col gap-5">
      <h2 id="descobertas" className="font-serif text-2xl tracking-tight">
        Populares e descobertas
      </h2>
      <ul aria-label="Filtrar por gênero" className="flex flex-wrap gap-2">
        {[{ slug: null, label: "Tudo" }, ...GENRES].map((item) => {
          const selected = item.slug === genre;
          return (
            <li key={item.slug ?? DISCOVERY_ALL}>
              <motion.button
                type="button"
                aria-pressed={selected}
                onClick={() => choose(item.slug)}
                whileTap={{ scale: pressScale }}
                transition={springs.snappy}
                className={cn(
                  "h-8 cursor-pointer rounded-full border px-3 text-sm transition-colors",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </motion.button>
            </li>
          );
        })}
      </ul>

      {query.isError && !query.data ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Não deu para trazer as descobertas agora.
          </p>
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : !query.data ? (
        <DiscoverySkeleton />
      ) : query.data.pages[0]?.results.length === 0 ? (
        <EmptyState
          illustration={EmptyShelfIllustration}
          title="Nada por aqui ainda"
          description="Quando as estantes crescerem, os livros desse gênero aparecem aqui."
          action={
            <Button variant="outline" onClick={() => choose(null)}>
              Ver todos os gêneros
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {query.data.pages.map((page, index) => (
            <Stagger key={`${genre}-${index}`} className={COVER_GRID}>
              {page.results.map((result) => (
                <StaggerItem
                  key={
                    result.catalogId ?? `${result.source}:${result.sourceId}`
                  }
                >
                  <ResultCard
                    result={result}
                    outside={
                      !result.catalogId && result.source === "openlibrary"
                        ? {
                            source: "openlibrary",
                            sourceId: result.sourceId,
                            discovery: genre ?? DISCOVERY_ALL,
                          }
                        : null
                    }
                  />
                </StaggerItem>
              ))}
            </Stagger>
          ))}
          {query.hasNextPage ? (
            <Button
              variant="outline"
              className="self-center"
              disabled={query.isFetchingNextPage}
              onClick={() => void query.fetchNextPage()}
            >
              {query.isFetchingNextPage ? "Carregando…" : "Ver mais"}
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function DiscoverySkeleton() {
  return (
    <div aria-busy aria-label="Carregando livros" className={COVER_GRID}>
      {Array.from({ length: 12 }, (_, cover) => (
        <div key={cover} className="flex flex-col gap-2">
          <Skeleton className="aspect-2/3 rounded-cover" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
      <ReturningCover />
    </div>
  );
}
