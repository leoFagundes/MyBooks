"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useId, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BookCover } from "@/features/books/components/book-cover";
import { formatNumber } from "@/lib/format";
import { springs } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { updateCurrentPage } from "../actions";
import type { ShelfItem } from "../queries";

function progressLabel(page: number | null, total: number | null) {
  if (page === null) return "Sem página ainda";
  return total
    ? `p. ${formatNumber(page)} de ${formatNumber(total)}`
    : `p. ${formatNumber(page)}`;
}

/**
 * "Lendo agora" (spec §5.3): uma faixa com as capas e o progresso. Tocar
 * numa capa abre o popover para atualizar a página atual.
 */
export function ReadingNow({ entries }: { entries: ShelfItem[] }) {
  if (entries.length === 0) return null;
  return (
    <section aria-labelledby="lendo-agora" className="flex flex-col gap-4">
      <h2 id="lendo-agora" className="font-serif text-2xl tracking-tight">
        Lendo agora
      </h2>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pt-1 pb-3 sm:-mx-6 sm:px-6">
        {entries.map((entry) => (
          <ReadingItem key={entry.book.id} entry={entry} />
        ))}
      </ul>
    </section>
  );
}

function ReadingItem({ entry }: { entry: ShelfItem }) {
  const { book } = entry;
  const [page, setPage] = useOptimistic(entry.currentPage);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const total = book.pageCount;
  const progress = total && page !== null ? Math.min(1, page / total) : 0;
  const label = progressLabel(page, total);

  function save(next: number) {
    setOpen(false);
    startTransition(async () => {
      setPage(next);
      const result = await updateCurrentPage(book.id, next);
      if (!result.ok) toast.error(result.error, { description: book.title });
    });
  }

  return (
    <li className="w-24 shrink-0 snap-start sm:w-28">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${book.title}: ${label}. Atualizar a página`}
            className="block w-full cursor-pointer rounded-cover"
          >
            <BookCover book={book} size="fill" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <PageForm
            bookId={book.id}
            current={page}
            total={total}
            onSave={save}
          />
        </PopoverContent>
      </Popover>
      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full origin-left rounded-full bg-foreground"
          initial={false}
          animate={{ scaleX: progress }}
          transition={springs.smooth}
        />
      </div>
      <p className="mt-1.5 truncate font-mono text-[11px] text-muted-foreground">
        {label}
      </p>
    </li>
  );
}

function PageForm({
  bookId,
  current,
  total,
  onSave,
}: {
  bookId: string;
  current: number | null;
  total: number | null;
  onSave: (page: number) => void;
}) {
  const id = useId();
  const [value, setValue] = useState(current === null ? "" : String(current));
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const page = Number(value);
    if (value.trim() === "" || !Number.isInteger(page) || page < 0) {
      setError("Escreva o número da página.");
      return;
    }
    if (total && page > total) {
      setError(`Esse livro tem ${formatNumber(total)} páginas.`);
      return;
    }
    onSave(page);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <Label htmlFor={`${id}-pagina`}>Em que página você está?</Label>
      <div className="flex gap-2">
        <Input
          id={`${id}-pagina`}
          type="number"
          inputMode="numeric"
          min={0}
          max={total ?? 20_000}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-erro` : undefined}
          className="font-mono"
        />
        <Button type="submit">Salvar</Button>
      </div>
      {total ? (
        <p className="font-mono text-[11px] text-muted-foreground">
          de {formatNumber(total)} páginas
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-erro`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <Link
        href={routes.book(bookId)}
        className="self-start rounded-sm text-sm underline decoration-border-strong underline-offset-4 hover:decoration-foreground"
      >
        Abrir o livro
      </Link>
    </form>
  );
}
