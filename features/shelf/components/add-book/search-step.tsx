"use client";

import { Command } from "cmdk";
import { useState } from "react";
import {
  Check,
  CornerDownLeft,
  LoaderCircle,
  PenLine,
  Search,
} from "lucide-react";
import {
  commandGroupClasses,
  commandInputClasses,
  commandItemClasses,
} from "@/components/ui/command-styles";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BookCover } from "@/features/books/components/book-cover";
import {
  byline,
  type ChosenBook,
  chooseResult,
  resultKey,
  resultVisual,
} from "./chosen-book";
import { useBookSearch } from "./use-book-search";

const MANUAL = "__cadastrar-manualmente";
// O que chega na lista entra com fade, sem pular na tela
const arrives =
  "animate-[aparecer_var(--duration-base)_var(--ease-standard)_both]";

function ResultsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-1 px-3 py-2">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 py-1.5">
          <Skeleton className="h-15 w-10 rounded-cover" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Busca no catálogo e na Open Library; setas andam, Enter escolhe. */
export function SearchStep({
  query,
  onQueryChange,
  onChoose,
  onManual,
  picked,
  context,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onChoose: (book: ChosenBook) => void;
  onManual: () => void;
  /** Resultados que já foram para a coleção (modo coleção). */
  picked?: ReadonlySet<string>;
  /** Para onde vão os livros escolhidos, acima da busca. */
  context?: string;
}) {
  const search = useBookSearch(query);
  const nothingFound =
    !search.idle &&
    !search.catalogPending &&
    !search.externalPending &&
    search.results.length === 0;

  // Os resultados chegam depois da letra digitada, e o cmdk ficaria no item
  // que estava em primeiro antes deles. Quando o primeiro muda, ele vem escolhido;
  // os da Open Library entram embaixo sem tirar a seta do lugar
  const first = search.results[0] ? resultKey(search.results[0]) : MANUAL;
  const [selected, setSelected] = useState(first);
  const [lastFirst, setLastFirst] = useState(first);
  if (lastFirst !== first) {
    setLastFirst(first);
    setSelected(first);
  }

  return (
    <Command
      label="Buscar livro"
      shouldFilter={false}
      loop
      value={selected}
      onValueChange={setSelected}
    >
      {context ? (
        <p className="truncate border-b border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
          {context}
        </p>
      ) : null}
      <div className="flex items-center gap-3 border-b border-border px-4">
        {search.externalPending && !search.idle ? (
          <LoaderCircle
            className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
            aria-hidden
          />
        ) : (
          <Search
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}
        <Command.Input
          value={query}
          onValueChange={onQueryChange}
          placeholder="Título, autor ou ISBN"
          className={commandInputClasses}
        />
        <Kbd>Esc</Kbd>
      </div>
      <Command.List className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain p-2">
        {search.idle ? (
          <p className="px-3 py-6 text-center text-sm text-pretty text-muted-foreground">
            Busque pelo título, pelo nome de quem escreveu ou pelo ISBN.
          </p>
        ) : null}
        {!search.idle && search.catalogPending ? <ResultsSkeleton /> : null}
        {search.results.length > 0 ? (
          <Command.Group heading="Livros" className={commandGroupClasses}>
            {search.results.map((result) => {
              const visual = resultVisual(result);
              return (
                <Command.Item
                  key={resultKey(result)}
                  value={resultKey(result)}
                  data-title={result.title}
                  onSelect={() => {
                    const chosen = chooseResult(result, search.query);
                    if (chosen) onChoose(chosen);
                  }}
                  className={cn(commandItemClasses, arrives)}
                >
                  <BookCover book={visual} size="xs" tilt={false} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="line-clamp-2 font-serif text-base leading-snug">
                      {result.title}
                    </span>
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      {byline(visual)}
                    </span>
                  </span>
                  {picked?.has(resultKey(result)) ? (
                    <span className="flex shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground">
                      <Check className="size-4" aria-hidden />
                      na coleção
                    </span>
                  ) : null}
                </Command.Item>
              );
            })}
          </Command.Group>
        ) : null}
        {!search.idle && search.externalPending && !search.catalogPending ? (
          <p
            className={cn(
              "px-3 py-2.5 font-mono text-xs text-muted-foreground",
              arrives,
            )}
          >
            Procurando na Open Library…
          </p>
        ) : null}
        {search.externalFailed ? (
          <p
            className={cn(
              "px-3 py-2.5 text-xs text-pretty text-muted-foreground",
              arrives,
            )}
          >
            A Open Library não respondeu agora. Por enquanto, só o que já está
            no catálogo.
          </p>
        ) : null}
        {nothingFound ? (
          <p
            className={cn(
              "px-3 py-6 text-center text-sm text-pretty text-muted-foreground",
              arrives,
            )}
          >
            Nenhum livro com esse nome. Que tal cadastrar à mão?
          </p>
        ) : null}
        <Command.Group heading="Não achou?" className={commandGroupClasses}>
          <Command.Item
            value={MANUAL}
            onSelect={onManual}
            className={commandItemClasses}
          >
            <PenLine />
            Cadastrar manualmente
          </Command.Item>
        </Command.Group>
      </Command.List>
      <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          navegar
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>
            <CornerDownLeft className="size-3" aria-hidden />
          </Kbd>
          escolher
        </span>
        <span className="ml-auto hidden items-center gap-1.5 sm:flex">
          <Kbd>N</Kbd>
          abre de qualquer lugar
        </span>
      </div>
    </Command>
  );
}
