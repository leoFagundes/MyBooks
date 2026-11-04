"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useShelfFlight } from "@/components/shell/shelf-flight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { BookCover } from "@/features/books/components/book-cover";
import { StarRating } from "@/features/books/components/star-rating";
import { actionErrorMessage, unwrapAction } from "@/lib/action";
import { formatNumber } from "@/lib/format";
import { springs, tweens } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { finishReading, updateCurrentPage } from "../actions";
import { today } from "../lib/today";
import type { ShelfItem } from "../queries";

function progressLabel(page: number | null, total: number | null) {
  if (page === null) return "Sem página ainda";
  return total
    ? `p. ${formatNumber(page)} de ${formatNumber(total)}`
    : `p. ${formatNumber(page)}`;
}

type Finish = { rating: number | null; review: string };

/**
 * "Lendo agora" (spec §5.3): uma faixa com as capas e o progresso. Tocar
 * numa capa abre o popover para atualizar a página atual ou, no fim,
 * "Terminei": o livro vira Lido ali mesmo, com nota e resenha, e a capa voa
 * até "Minha estante".
 */
export function ReadingNow({ entries }: { entries: ShelfItem[] }) {
  const router = useRouter();
  const { fly } = useShelfFlight();
  const [shown, hide] = useOptimistic(entries, (list, bookId: string) =>
    list.filter((entry) => entry.book.id !== bookId),
  );
  const [, startTransition] = useTransition();

  function finish(entry: ShelfItem, details: Finish, cover: Element | null) {
    const { book } = entry;
    if (cover) fly(cover, book);
    startTransition(async () => {
      hide(book.id);
      const saving = unwrapAction(
        finishReading({
          bookId: book.id,
          finishedAt: today(),
          rating: details.rating,
          review: details.review,
        }),
      );
      toast.promise(saving, {
        loading: "Guardando como lido…",
        description: book.title,
        success: () => ({
          message: "Lido! Já está na sua estante",
          description: book.title,
          action: {
            label: "Abrir",
            onClick: () => router.push(routes.book(book.id)),
          },
        }),
        error: (error: unknown) => ({
          message: actionErrorMessage(error),
          description: book.title,
        }),
      });
      await saving.catch(() => undefined);
    });
  }

  if (shown.length === 0) return null;
  return (
    <section aria-labelledby="lendo-agora" className="flex flex-col gap-4">
      <h2 id="lendo-agora" className="font-serif text-2xl tracking-tight">
        Lendo agora
      </h2>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pt-1 pb-3 sm:-mx-6 sm:px-6">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((entry) => (
            <ReadingItem
              key={entry.book.id}
              entry={entry}
              onFinish={(details, cover) => finish(entry, details, cover)}
            />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

function ReadingItem({
  entry,
  onFinish,
}: {
  entry: ShelfItem;
  onFinish: (details: Finish, cover: Element | null) => void;
}) {
  const { book } = entry;
  const [page, setPage] = useOptimistic(entry.currentPage);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"page" | "finish">("page");
  const [, startTransition] = useTransition();
  const cover = useRef<HTMLButtonElement>(null);
  const total = book.pageCount;
  const progress = total && page !== null ? Math.min(1, page / total) : 0;
  const label = progressLabel(page, total);

  function save(next: number) {
    // Chegou à última página: em vez de fechar, pergunta se terminou
    if (total && next >= total) {
      setStep("finish");
      return;
    }
    setOpen(false);
    startTransition(async () => {
      setPage(next);
      const result = await updateCurrentPage(book.id, next);
      if (!result.ok) toast.error(result.error, { description: book.title });
    });
  }

  return (
    <motion.li
      layout
      exit={{ opacity: 0, scale: 0.9, transition: tweens.fast }}
      transition={springs.smooth}
      className="w-24 shrink-0 snap-start sm:w-28"
    >
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setStep("page");
        }}
      >
        <PopoverTrigger asChild>
          <button
            ref={cover}
            type="button"
            aria-label={`${book.title}: ${label}. Atualizar a página`}
            className="block w-full cursor-pointer rounded-cover"
          >
            <BookCover book={book} size="fill" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          {step === "page" ? (
            <PageForm
              bookId={book.id}
              current={page}
              total={total}
              onSave={save}
              onFinish={() => setStep("finish")}
            />
          ) : (
            <FinishForm
              title={book.title}
              onBack={() => setStep("page")}
              onSave={(details) => {
                setOpen(false);
                setStep("page");
                onFinish(details, cover.current);
              }}
            />
          )}
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
    </motion.li>
  );
}

function PageForm({
  bookId,
  current,
  total,
  onSave,
  onFinish,
}: {
  bookId: string;
  current: number | null;
  total: number | null;
  onSave: (page: number) => void;
  onFinish: () => void;
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <Link
          href={routes.book(bookId)}
          className="rounded-sm text-sm underline decoration-border-strong underline-offset-4 hover:decoration-foreground"
        >
          Abrir o livro
        </Link>
        <Button type="button" variant="outline" size="sm" onClick={onFinish}>
          <Check aria-hidden />
          Terminei
        </Button>
      </div>
    </form>
  );
}

/** O fim da leitura: a nota (opcional) e uma linha sobre o livro. */
function FinishForm({
  title,
  onBack,
  onSave,
}: {
  title: string;
  onBack: () => void;
  onSave: (details: Finish) => void;
}) {
  const id = useId();
  const [rating, setRating] = useState<number | null>(null);
  const [review, setReview] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ rating, review });
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-0.5">
        <p className="font-serif text-lg leading-tight">Terminou!</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          O que achou de {title}?
        </p>
      </div>
      <StarRating value={rating} onChange={setRating} label="Sua nota" />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-resenha`}>
          Uma linha sobre o livro{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Textarea
          id={`${id}-resenha`}
          rows={2}
          maxLength={10_000}
          value={review}
          onChange={(event) => setReview(event.target.value)}
          className="min-h-16"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          Voltar
        </Button>
        <Button type="submit" size="sm">
          Marcar como lido
        </Button>
      </div>
    </form>
  );
}
