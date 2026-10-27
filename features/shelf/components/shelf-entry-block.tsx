"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StarRating } from "@/features/books/components/star-rating";
import type { BookVisual } from "@/features/books/types";
import { formatNumber } from "@/lib/format";
import { removeFromShelf, updateShelfEntry } from "../actions";
import type { BookQuote, ShelfEntryDetails } from "../queries";
import type { ShelfStatus } from "../schemas";
import { useAddBook } from "./add-book/add-book-provider";
import { QuotesBlock } from "./quotes-block";
import { ReviewEditor } from "./review-editor";

const STATUS_OPTIONS = [
  { value: "want", label: "Quero ler" },
  { value: "reading", label: "Lendo" },
  { value: "read", label: "Lido" },
  { value: "abandoned", label: "Abandonado" },
] as const satisfies readonly { value: ShelfStatus; label: string }[];

// O dia de hoje no fuso de quem usa, no formato do <input type="date">
const today = () => new Date().toLocaleDateString("sv-SE");

/** As regras do banco valem já na tela: quem quer ler não tem nota nem datas… */
function coherent(entry: ShelfEntryDetails): ShelfEntryDetails {
  switch (entry.status) {
    case "want":
      return {
        ...entry,
        rating: null,
        startedAt: null,
        finishedAt: null,
        currentPage: null,
      };
    case "reading":
      return { ...entry, finishedAt: null };
    default:
      return { ...entry, currentPage: null };
  }
}

/**
 * "Sua leitura" na página do livro: status, nota, datas, página atual,
 * resenha e citações. Cada mudança aparece na hora (useOptimistic) e vai
 * para o servidor; se falhar, volta sozinha e um toast conta.
 */
export function ShelfEntryBlock({
  book,
  entry: saved,
  quotes,
}: {
  book: BookVisual;
  entry: ShelfEntryDetails;
  quotes: BookQuote[];
}) {
  const id = useId();
  const [, startTransition] = useTransition();
  const [entry, setOptimistic] = useOptimistic(
    saved,
    (_current, next: ShelfEntryDetails) => next,
  );
  const [pageDraft, setPageDraft] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function save(changes: Partial<ShelfEntryDetails>) {
    const next = coherent({ ...entry, ...changes });
    startTransition(async () => {
      setOptimistic(next);
      const result = await updateShelfEntry(book.id, {
        status: next.status,
        rating: next.rating,
        startedAt: next.startedAt,
        finishedAt: next.finishedAt,
        currentPage: next.currentPage,
      });
      if (!result.ok) toast.error(result.error);
    });
  }

  function commitPage() {
    if (pageDraft === null) return;
    const value = pageDraft.trim() ? Number(pageDraft) : null;
    setPageDraft(null);
    if (value !== entry.currentPage) save({ currentPage: value });
  }

  function remove() {
    setConfirming(false);
    startTransition(async () => {
      const result = await removeFromShelf(book.id);
      if (result.ok) toast("Tirei da estante", { description: book.title });
      else toast.error(result.error);
    });
  }

  const finishedLabel = entry.status === "read" ? "Terminei em" : "Parei em";

  return (
    <section
      aria-labelledby={`${id}-titulo`}
      className="flex flex-col gap-6 rounded-card border border-border p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id={`${id}-titulo`} className="font-serif text-2xl tracking-tight">
          Sua leitura
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(true)}
        >
          Tirar da estante
        </Button>
      </div>

      <SegmentedControl
        aria-label="Status"
        options={STATUS_OPTIONS}
        value={entry.status}
        onValueChange={(status) => save({ status })}
        className="self-start"
      />

      {entry.status !== "want" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span aria-hidden className="text-sm font-medium">
              Nota
            </span>
            <StarRating
              value={entry.rating}
              onChange={(rating) => save({ rating })}
            />
          </div>
          {entry.status === "reading" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-pagina`}>Página atual</Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`${id}-pagina`}
                  inputMode="numeric"
                  className="w-24"
                  value={pageDraft ?? String(entry.currentPage ?? "")}
                  onChange={(event) =>
                    setPageDraft(
                      event.target.value.replace(/\D/g, "").slice(0, 5),
                    )
                  }
                  onBlur={commitPage}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitPage();
                  }}
                />
                {book.pageCount ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    de {formatNumber(book.pageCount)}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-inicio`}>Comecei em</Label>
            <Input
              id={`${id}-inicio`}
              type="date"
              max={entry.finishedAt ?? today()}
              // O dia de hoje do servidor (UTC) pode não ser o de quem usa
              suppressHydrationWarning
              value={entry.startedAt ?? ""}
              onChange={(event) =>
                save({ startedAt: event.target.value || null })
              }
            />
          </div>
          {entry.status !== "reading" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-fim`}>{finishedLabel}</Label>
              <Input
                id={`${id}-fim`}
                type="date"
                min={entry.startedAt ?? undefined}
                max={today()}
                suppressHydrationWarning
                value={entry.finishedAt ?? ""}
                onChange={(event) =>
                  save({ finishedAt: event.target.value || null })
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {entry.status !== "want" ? (
        <ReviewEditor bookId={book.id} initial={entry.review} />
      ) : null}

      <QuotesBlock
        bookId={book.id}
        quotes={quotes}
        pageCount={book.pageCount}
      />

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tirar da estante?</DialogTitle>
            <DialogDescription>
              {book.title} sai da sua estante, com a nota, as datas e a resenha.
              As citações ficam guardadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button onClick={remove}>Tirar da estante</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Quem não tem o livro: um convite que abre a paleta já no passo de status. */
export function AddToShelfPrompt({ book }: { book: BookVisual }) {
  const addBook = useAddBook();
  return (
    <section className="flex flex-col items-start gap-3 rounded-card border border-dashed border-border p-5 sm:p-6">
      <h2 className="font-serif text-2xl tracking-tight">Na sua estante?</h2>
      <p className="text-sm text-pretty text-muted-foreground">
        Guarde com status, nota e data. Depois dá para escrever a resenha e
        guardar citações.
      </p>
      <Button
        onClick={() =>
          addBook.openWith({ ref: { catalogId: book.id }, visual: book })
        }
      >
        Adicionar à estante
      </Button>
    </section>
  );
}
