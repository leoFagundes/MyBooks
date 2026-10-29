"use client";

import { Check } from "lucide-react";
import { useId, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { SwapText } from "@/components/motion/swap-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BookCover } from "@/features/books/components/book-cover";
import type { SearchResult } from "@/features/books/lib/search-result";
import { addBook, removeFromShelf } from "@/features/shelf/actions";
import {
  byline,
  chooseResult,
  resultKey,
  resultVisual,
} from "@/features/shelf/components/add-book/chosen-book";
import { useBookSearch } from "@/features/shelf/components/add-book/use-book-search";
import type { ShelfStatus } from "@/features/shelf/schemas";
import { formatNumber } from "@/lib/format";
import { StepFrame } from "./step-frame";

const without = (shelf: Record<string, ShelfStatus>, key: string) =>
  Object.fromEntries(Object.entries(shelf).filter(([id]) => id !== key));

const STATUS_LABEL: Record<ShelfStatus, string> = {
  want: "Quero ler",
  read: "Lido",
  reading: "Lendo",
  abandoned: "Abandonado",
};

const NO_DETAILS = { rating: null, startedAt: null, finishedAt: null };

export function BooksStep({
  added,
  onChange,
  onBack,
  onDone,
}: {
  /** O que já está na estante, pelo id do catálogo. */
  added: Record<string, ShelfStatus>;
  onChange: React.Dispatch<React.SetStateAction<Record<string, ShelfStatus>>>;
  onBack: () => void;
  onDone: () => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const search = useBookSearch(query);
  const [, startTransition] = useTransition();
  // Livro de fora só ganha id do catálogo quando chega lá
  const [catalogIds, setCatalogIds] = useState<Record<string, string>>({});
  // O botão apertado some (vira "Na estante", ou volta): o foco vai para o
  // botão que entra no lugar dele, na mesma linha, e não se perde no body
  const [refocus, setRefocus] = useState<string | null>(null);
  // A estante muda na hora; se a action falhar, volta sozinha
  const [shelf, setOptimisticShelf] = useOptimistic(
    added,
    (current, change: { key: string; status: ShelfStatus | null }) =>
      change.status
        ? { ...current, [change.key]: change.status }
        : without(current, change.key),
  );
  const count = Object.keys(shelf).length;

  const shelfKey = (result: SearchResult) =>
    result.catalogId ?? catalogIds[resultKey(result)] ?? resultKey(result);

  function add(result: SearchResult, status: ShelfStatus) {
    const chosen = chooseResult(result, search.query);
    if (!chosen) return;
    const key = resultKey(result);
    setRefocus(key);
    startTransition(async () => {
      setOptimisticShelf({ key: shelfKey(result), status });
      const response = await addBook({
        book: chosen.ref,
        details: { status, ...NO_DETAILS },
      });
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      const bookId = response.data.bookId;
      setCatalogIds((current) => ({ ...current, [key]: bookId }));
      // Atualização funcional: dois cliques seguidos não se sobrescrevem
      onChange((current) => ({ ...current, [bookId]: status }));
    });
  }

  function remove(result: SearchResult) {
    const bookId = result.catalogId ?? catalogIds[resultKey(result)];
    if (!bookId) return;
    setRefocus(resultKey(result));
    startTransition(async () => {
      setOptimisticShelf({ key: bookId, status: null });
      const response = await removeFromShelf(bookId);
      if (response.ok) onChange((current) => without(current, bookId));
      else toast.error(response.error);
    });
  }

  const nothingFound =
    !search.idle &&
    !search.catalogPending &&
    !search.externalPending &&
    search.results.length === 0;

  return (
    <StepFrame
      title="Seus primeiros livros"
      description="Comece por um livro que você ama ou por um que quer ler logo. A estante cresce com você."
      focusTitle
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onBack}>
            Voltar
          </Button>
          <Button type="button" size="lg" onClick={onDone}>
            Continuar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-busca`}>Buscar livros</Label>
          <Input
            id={`${id}-busca`}
            type="search"
            placeholder="Título, autor ou ISBN"
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setRefocus(null);
            }}
          />
        </div>

        <div aria-live="polite" className="min-h-48">
          {search.idle ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Digite pelo menos duas letras.
            </p>
          ) : search.catalogPending ? (
            <div
              aria-busy
              aria-label="Buscando"
              className="flex flex-col gap-3"
            >
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <Skeleton className="h-15 w-10 rounded-cover" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : nothingFound ? (
            <p className="py-6 text-center text-sm text-pretty text-muted-foreground">
              {search.externalFailed
                ? "A busca não respondeu agora. Tente de novo em instantes."
                : "Nenhum livro com esse nome. Depois, no app, dá para cadastrar à mão pelo +."}
            </p>
          ) : (
            <>
              <ul
                aria-label="Resultados"
                className="flex flex-col divide-y divide-border"
              >
                {search.results.map((result) => {
                  const visual = resultVisual(result);
                  const status = shelf[shelfKey(result)];
                  return (
                    <li
                      key={resultKey(result)}
                      className="flex animate-[aparecer_var(--duration-base)_var(--ease-standard)_both] items-center gap-3 py-3"
                    >
                      <BookCover book={visual} size="xs" tilt={false} />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="line-clamp-2 font-serif text-lg leading-snug">
                          {result.title}
                        </span>
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {byline(visual)}
                        </span>
                      </div>
                      {status ? (
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="flex items-center gap-1 text-xs text-foreground">
                            <Check className="size-3.5" aria-hidden />
                            Na estante
                            <span className="sr-only">
                              {" "}
                              como {STATUS_LABEL[status]}
                            </span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            autoFocus={refocus === resultKey(result)}
                            onClick={() => remove(result)}
                          >
                            Desfazer
                          </Button>
                        </div>
                      ) : (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            autoFocus={refocus === resultKey(result)}
                            onClick={() => add(result, "want")}
                          >
                            Quero ler
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => add(result, "read")}
                          >
                            Já li
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {search.externalPending ? (
                <p className="py-3 font-mono text-xs text-muted-foreground">
                  Procurando na Open Library…
                </p>
              ) : null}
            </>
          )}
        </div>

        {count > 0 ? (
          <p className="font-mono text-xs text-muted-foreground">
            <SwapText
              text={
                count === 1
                  ? "1 livro na estante"
                  : `${formatNumber(count)} livros na estante`
              }
            />
          </p>
        ) : null}
      </div>
    </StepFrame>
  );
}
