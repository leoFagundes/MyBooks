"use client";

import { useQuery } from "@tanstack/react-query";
import { PenLine, Search } from "lucide-react";
import Link from "next/link";
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

import { useAddBook } from "@/features/shelf/components/add-book/add-book-provider";
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
 * "Não achou?": abre o cadastro à mão com o que a pessoa buscou no título.
 * Sem conta, leva a entrar e volta para a mesma busca.
 */
function ManualRegister({ query }: { query: string }) {
  const { enabled: signedIn, openManual } = useAddBook();
  if (!signedIn) {
    return (
      <Button variant="outline" asChild>
        <Link
          href={{
            pathname: routes.entrar,
            query: { next: `/explorar?q=${encodeURIComponent(query)}` },
          }}
        >
          Entrar para cadastrar
        </Link>
      </Button>
    );
  }
  return (
    <Button variant="outline" onClick={() => openManual(query)}>
      <PenLine aria-hidden />
      Cadastrar à mão
    </Button>
  );
}

const sectionLabel =
  "font-mono text-[11px] tracking-wide text-muted-foreground uppercase";

/**
 * Livros: o catálogo primeiro (na hora) e as fontes de fora logo depois, sem
 * repetidos (fica a versão do catálogo). Os de fora vêm numa seção própria,
 * com "Cadastrar no MyBooks"; e, se nada servir, o cadastro à mão.
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
        description="Nem no MyBooks nem na Open Library. Se o livro existe, cadastre: ele entra no catálogo para todo mundo."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <ManualRegister query={search.query} />
            <Button variant="ghost" onClick={onClear}>
              Limpar busca
            </Button>
          </div>
        }
      />
    );
  }
  const inside = search.results.filter((result) => result.catalogId);
  const outside = search.results.flatMap((result) =>
    !result.catalogId && result.source !== "manual"
      ? [{ result, source: result.source }]
      : [],
  );
  return (
    <div className="flex flex-col gap-10">
      {inside.length > 0 ? (
        <section aria-labelledby="no-mybooks" className="flex flex-col gap-4">
          <h2 id="no-mybooks" className={sectionLabel}>
            No MyBooks
          </h2>
          <Stagger key={search.query} className={COVER_GRID}>
            {inside.map((result) => (
              <StaggerItem key={result.catalogId}>
                <ResultCard result={result} outside={null} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      ) : null}
      {outside.length > 0 ? (
        <section
          aria-labelledby="fora-do-mybooks"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <h2 id="fora-do-mybooks" className={sectionLabel}>
              Ainda não estão no MyBooks
            </h2>
            <p className="text-sm text-pretty text-muted-foreground">
              Achamos na Open Library. Cadastre para pôr na estante, numa
              coleção ou no fórum.
            </p>
          </div>
          <Stagger key={`fora-${search.query}`} className={COVER_GRID}>
            {outside.map(({ result, source }) => (
              <StaggerItem key={`${source}:${result.sourceId}`}>
                <ResultCard
                  result={result}
                  register
                  outside={{
                    source,
                    sourceId: result.sourceId,
                    query: search.query,
                  }}
                />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
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
      ) : (
        <div className="flex flex-col items-start gap-2 border-t border-border pt-6">
          <p className="text-sm text-pretty text-muted-foreground">
            Não achou o seu? Cadastre o livro: ele entra no catálogo para todo
            mundo.
          </p>
          <ManualRegister query={search.query} />
        </div>
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
