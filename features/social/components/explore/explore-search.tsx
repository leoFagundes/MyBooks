"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchIllustration } from "@/components/ui/illustrations";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CollectionCard } from "@/features/collections/components/collection-card";
import type { CollectionVisual } from "@/features/collections/types";

import { useBookSearch } from "@/features/shelf/components/add-book/use-book-search";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { routes } from "@/lib/routes";
import { readsLine } from "../../lib/reads-line";
import type { ReaderListItem } from "../../queries";
import { ReaderRow } from "../reader-row";
import { replaceExploreParams, useExploreSearchParams } from "./explore-url";
import { COVER_GRID, ResultCard } from "./result-card";

const TABS = [
  { value: "livros", label: "Livros" },
  { value: "leitores", label: "Leitores" },
  { value: "colecoes", label: "Coleções" },
] as const;

type Tab = (typeof TABS)[number]["value"];

type SearchState = { q: string; tab: Tab };

type ExploreResults = {
  readers?: ReaderListItem[];
  collections?: CollectionVisual[];
};

function readUrl(search: string): SearchState {
  const params = new URLSearchParams(search);
  const tab = TABS.find((item) => item.value === params.get("aba"))?.value;
  return { q: (params.get("q") ?? "").slice(0, 100), tab: tab ?? "livros" };
}

async function fetchResults(query: string, tab: Tab): Promise<ExploreResults> {
  const params = new URLSearchParams({ q: query, aba: tab });
  const response = await fetch(`/api/explore/search?${params}`);
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as ExploreResults;
}

/**
 * A busca única do Explorar (spec §5.9), com as abas Livros, Leitores e
 * Coleções. Livros busca no catálogo (na hora) e na Open Library (logo
 * depois), como a paleta. A busca e a aba ficam na URL (?q=&aba=) sem ida
 * ao servidor; sem busca, aparecem as seções (children).
 */
export function ExploreSearch({ children }: { children: React.ReactNode }) {
  const search = useExploreSearchParams();
  const [edited, setEdited] = useState<SearchState | null>(null);
  const current = edited ?? readUrl(search);
  const query = useDebouncedValue(current.q.trim(), 200);
  const searching = current.q.trim().length >= 2;

  function update(next: SearchState) {
    setEdited(next);
    replaceExploreParams({
      q: next.q.trim() ? next.q : null,
      aba: next.tab !== "livros" ? next.tab : null,
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <div role="search" className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label="Buscar livros, leitores e coleções"
          // Curto: cabe inteiro em 360px
          placeholder="Livros, leitores e coleções"
          value={current.q}
          onChange={(event) => update({ ...current, q: event.target.value })}
          className="h-12 pl-12 text-base"
        />
      </div>
      {searching ? (
        <Tabs
          value={current.tab}
          onValueChange={(tab) => update({ ...current, tab: tab as Tab })}
        >
          <TabsList aria-label="O que buscar">
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={current.tab}>
            {current.tab === "livros" ? (
              <BookResults
                raw={current.q}
                onClear={() => update({ q: "", tab: current.tab })}
              />
            ) : (
              <Results
                query={query}
                tab={current.tab}
                onClear={() => update({ q: "", tab: current.tab })}
              />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        children
      )}
    </div>
  );
}

/**
 * Livros: o catálogo primeiro (na hora) e a Open Library logo depois, sem
 * repetidos (fica a versão do catálogo), cada um com o selo da origem.
 */
function BookResults({ raw, onClear }: { raw: string; onClear: () => void }) {
  const search = useBookSearch(raw);
  if (search.idle) return null;
  if (search.catalogPending && search.results.length === 0) {
    return <ResultsSkeleton tab="livros" />;
  }
  if (search.results.length === 0 && !search.externalPending) {
    return (
      <EmptyState
        illustration={SearchIllustration}
        title={`Nada com “${search.query}” em Livros`}
        description="Tente outra palavra ou veja as outras abas."
        action={
          <Button variant="outline" onClick={onClear}>
            Limpar busca
          </Button>
        }
      />
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {search.results.length > 0 ? (
        <Stagger key={search.query} className={COVER_GRID}>
          {search.results.map((result) => (
            <StaggerItem
              key={result.catalogId ?? `${result.source}:${result.sourceId}`}
            >
              <ResultCard
                result={result}
                outside={
                  !result.catalogId && result.source !== "manual"
                    ? {
                        source: result.source,
                        sourceId: result.sourceId,
                        query: search.query,
                      }
                    : null
                }
              />
            </StaggerItem>
          ))}
        </Stagger>
      ) : null}
      {search.externalPending ? (
        <p className="font-mono text-xs text-muted-foreground">
          Procurando na Open Library…
        </p>
      ) : search.externalFailed ? (
        <p className="font-mono text-xs text-muted-foreground">
          A Open Library não respondeu agora. Por enquanto, só o que já está no
          MyBooks.
        </p>
      ) : null}
    </div>
  );
}

function Results({
  query,
  tab,
  onClear,
}: {
  query: string;
  tab: Exclude<Tab, "livros">;
  onClear: () => void;
}) {
  const result = useQuery({
    queryKey: ["explorar", tab, query],
    queryFn: () => fetchResults(query, tab),
    enabled: query.length >= 2,
    staleTime: 60_000,
    // Enquanto a próxima letra busca, os resultados da mesma aba ficam
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === tab ? previous : undefined,
  });

  if (result.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Não deu para buscar agora.
        </p>
        <Button variant="outline" size="sm" onClick={() => result.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (!result.data) return <ResultsSkeleton tab={tab} />;

  const items =
    (tab === "leitores" ? result.data.readers : result.data.collections) ?? [];
  if (items.length === 0) {
    const label = TABS.find((item) => item.value === tab)?.label ?? "";
    return (
      <EmptyState
        illustration={SearchIllustration}
        title={`Nada com “${query}” em ${label}`}
        description="Tente outra palavra ou veja as outras abas."
        action={
          <Button variant="outline" onClick={onClear}>
            Limpar busca
          </Button>
        }
      />
    );
  }

  if (tab === "leitores") {
    return (
      <Stagger key={query} className="flex flex-col divide-y divide-border">
        {(result.data.readers ?? []).map((reader) => (
          <StaggerItem key={reader.id}>
            <ReaderRow
              reader={reader}
              state={reader.state}
              detail={readsLine(reader.favoriteGenres)}
            />
          </StaggerItem>
        ))}
      </Stagger>
    );
  }
  return (
    <Stagger key={query} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {(result.data.collections ?? []).map((collection) => (
        <StaggerItem key={collection.id}>
          <CollectionCard
            collection={collection}
            href={routes.collection(collection.id)}
          />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function ResultsSkeleton({ tab }: { tab: Tab }) {
  if (tab === "leitores") {
    return (
      <div
        role="status"
        aria-busy
        aria-label="Buscando leitores"
        className="flex flex-col"
      >
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3 py-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (tab === "colecoes") {
    return (
      <div
        role="status"
        aria-busy
        aria-label="Buscando coleções"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[0, 1, 2].map((card) => (
          <Skeleton key={card} className="h-64 rounded-card" />
        ))}
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-busy
      aria-label="Buscando livros"
      className={COVER_GRID}
    >
      {[0, 1, 2, 3, 4, 5].map((cover) => (
        <Skeleton key={cover} className="aspect-2/3 rounded-cover" />
      ))}
    </div>
  );
}
