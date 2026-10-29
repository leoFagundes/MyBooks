"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchIllustration } from "@/components/ui/illustrations";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookCover } from "@/features/books/components/book-cover";
import { BookLink } from "@/features/books/components/book-link";
import type { BookVisual } from "@/features/books/types";
import { CollectionCard } from "@/features/collections/components/collection-card";
import type { CollectionVisual } from "@/features/collections/types";

import { useDebouncedValue } from "@/lib/use-debounced-value";
import { routes } from "@/lib/routes";
import { readsLine } from "../../lib/reads-line";
import type { ReaderListItem } from "../../queries";
import { ReaderRow } from "../reader-row";

const TABS = [
  { value: "livros", label: "Livros" },
  { value: "leitores", label: "Leitores" },
  { value: "colecoes", label: "Coleções" },
] as const;

type Tab = (typeof TABS)[number]["value"];

type SearchState = { q: string; tab: Tab };

type ExploreResults = {
  books?: BookVisual[];
  readers?: ReaderListItem[];
  collections?: CollectionVisual[];
};

function readUrl(search: string): SearchState {
  const params = new URLSearchParams(search);
  const tab = TABS.find((item) => item.value === params.get("aba"))?.value;
  return { q: (params.get("q") ?? "").slice(0, 100), tab: tab ?? "livros" };
}

// A URL só é lida no navegador; no servidor e na hidratação, busca vazia
const noSubscription = () => () => {};
const readSearch = () => window.location.search;
const serverSearch = () => "";

async function fetchResults(query: string, tab: Tab): Promise<ExploreResults> {
  const params = new URLSearchParams({ q: query, aba: tab });
  const response = await fetch(`/api/explore/search?${params}`);
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as ExploreResults;
}

/**
 * A busca única do Explorar (spec §5.9), com as abas Livros, Leitores e
 * Coleções. A busca e a aba ficam na URL (?q=&aba=) sem ida ao servidor;
 * sem busca, aparecem as seções (children).
 */
export function ExploreSearch({ children }: { children: React.ReactNode }) {
  const search = useSyncExternalStore(noSubscription, readSearch, serverSearch);
  const [edited, setEdited] = useState<SearchState | null>(null);
  const current = edited ?? readUrl(search);
  const query = useDebouncedValue(current.q.trim(), 200);
  const searching = current.q.trim().length >= 2;

  function update(next: SearchState) {
    setEdited(next);
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q);
    if (next.tab !== "livros") params.set("aba", next.tab);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${params.size > 0 ? `?${params}` : ""}`,
    );
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
            <Results
              query={query}
              tab={current.tab}
              onClear={() => update({ q: "", tab: current.tab })}
            />
          </TabsContent>
        </Tabs>
      ) : (
        children
      )}
    </div>
  );
}

function Results({
  query,
  tab,
  onClear,
}: {
  query: string;
  tab: Tab;
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
    (tab === "livros"
      ? result.data.books
      : tab === "leitores"
        ? result.data.readers
        : result.data.collections) ?? [];
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

  if (tab === "livros") {
    return (
      <Stagger
        key={query}
        className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6"
      >
        {(result.data.books ?? []).map((book) => (
          <StaggerItem key={book.id}>
            <BookLink
              book={book}
              href={routes.book(book.id)}
              aria-label={book.title}
              className="block rounded-cover"
            >
              <BookCover book={book} size="fill" />
            </BookLink>
            <p className="mt-2 line-clamp-2 font-serif text-sm leading-tight text-balance">
              {book.title}
            </p>
            {book.authors[0] ? (
              <p className="mt-0.5 line-clamp-2 font-mono text-[11px] text-muted-foreground">
                {book.authors[0]}
              </p>
            ) : null}
          </StaggerItem>
        ))}
      </Stagger>
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
      <div aria-busy aria-label="Buscando leitores" className="flex flex-col">
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
      aria-busy
      aria-label="Buscando livros"
      className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6"
    >
      {[0, 1, 2, 3, 4, 5].map((cover) => (
        <Skeleton key={cover} className="aspect-2/3 rounded-cover" />
      ))}
    </div>
  );
}
