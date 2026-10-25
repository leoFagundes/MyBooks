"use client";

import { Check } from "lucide-react";
import {
  useEffect,
  useId,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { SwapText } from "@/components/motion/swap-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BookCover } from "@/features/books/components/book-cover";
import type { BookVisual } from "@/features/books/types";
import { addToShelf, removeFromShelf } from "@/features/shelf/actions";
import type { ShelfStatus } from "@/features/shelf/schemas";
import { formatNumber } from "@/lib/format";
import { StepFrame } from "./step-frame";

type Search =
  | { state: "idle" }
  | { state: "done"; query: string; results: BookVisual[] }
  | { state: "error"; query: string };

/** Busca no catálogo com debounce; a anterior é cancelada a cada letra. */
function useCatalogSearch(query: string): Search | { state: "loading" } {
  const [search, setSearch] = useState<Search>({ state: "idle" });
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/books/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(String(response.status));
        const { results } = (await response.json()) as {
          results: BookVisual[];
        };
        setSearch({ state: "done", query: trimmed, results });
      } catch {
        // Cancelada pela próxima letra, ou a busca falhou de verdade
        if (!controller.signal.aborted) {
          setSearch({ state: "error", query: trimmed });
        }
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  if (trimmed.length < 2) return { state: "idle" };
  if (search.state !== "idle" && search.query === trimmed) return search;
  return { state: "loading" };
}

const without = (shelf: Record<string, ShelfStatus>, bookId: string) =>
  Object.fromEntries(Object.entries(shelf).filter(([id]) => id !== bookId));

const STATUS_LABEL: Record<ShelfStatus, string> = {
  want: "Quero ler",
  read: "Lido",
  reading: "Lendo",
  abandoned: "Abandonado",
};

export function BooksStep({
  added,
  onChange,
  onBack,
  onDone,
}: {
  added: Record<string, ShelfStatus>;
  onChange: (added: Record<string, ShelfStatus>) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const search = useCatalogSearch(query);
  const [, startTransition] = useTransition();
  // A estante muda na hora; se a action falhar, volta sozinha
  const [shelf, setOptimisticShelf] = useOptimistic(added);
  const count = Object.keys(shelf).length;

  function add(bookId: string, status: ShelfStatus) {
    startTransition(async () => {
      setOptimisticShelf({ ...shelf, [bookId]: status });
      const result = await addToShelf(bookId, status);
      if (result.ok) onChange({ ...added, [bookId]: status });
      else toast.error(result.error);
    });
  }

  function remove(bookId: string) {
    startTransition(async () => {
      setOptimisticShelf(without(shelf, bookId));
      const result = await removeFromShelf(bookId);
      if (result.ok) onChange(without(added, bookId));
      else toast.error(result.error);
    });
  }

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
          <Label htmlFor={`${id}-busca`}>Buscar no catálogo</Label>
          <Input
            id={`${id}-busca`}
            type="search"
            placeholder="Título ou autor"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div aria-live="polite" className="min-h-48">
          {search.state === "idle" ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Digite pelo menos duas letras.
            </p>
          ) : search.state === "loading" ? (
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
          ) : search.state === "error" ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              A busca não respondeu agora. Tente de novo em instantes.
            </p>
          ) : search.results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum livro com esse nome no catálogo ainda.
            </p>
          ) : (
            <ul
              aria-label="Resultados"
              className="flex flex-col divide-y divide-border"
            >
              {search.results.map((book) => {
                const status = shelf[book.id];
                return (
                  <li key={book.id} className="flex items-center gap-3 py-3">
                    <BookCover book={book} size="xs" tilt={false} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="line-clamp-2 font-serif text-lg leading-snug">
                        {book.title}
                      </span>
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {[book.authors.join(", "), book.publishedYear]
                          .filter(Boolean)
                          .join(" · ")}
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
                          onClick={() => remove(book.id)}
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
                          onClick={() => add(book.id, "want")}
                        >
                          Quero ler
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => add(book.id, "read")}
                        >
                          Já li
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
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
