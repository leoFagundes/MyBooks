"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatNumber } from "@/lib/format";
import { springs, tweens } from "@/lib/motion";
import { addQuote, removeQuote } from "../actions";
import type { BookQuote } from "../queries";
import { quoteSchema } from "../schemas";

type Change =
  { type: "add"; quote: BookQuote } | { type: "remove"; id: string };

/** As citações da pessoa neste livro: guardar com a página e apagar. */
export function QuotesBlock({
  bookId,
  quotes: saved,
  pageCount,
}: {
  bookId: string;
  quotes: BookQuote[];
  pageCount: number | null;
}) {
  const id = useId();
  const [, startTransition] = useTransition();
  const [quotes, change] = useOptimistic(saved, (current, action: Change) =>
    action.type === "add"
      ? [...current, action.quote]
      : current.filter((quote) => quote.id !== action.id),
  );
  const [text, setText] = useState("");
  const [page, setPage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = quoteSchema.safeParse({
      text,
      page: page.trim() ? Number(page) : null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira a citação.");
      return;
    }
    setError(null);
    setText("");
    setPage("");
    const draft = { id: `nova-${Date.now()}`, ...parsed.data };
    startTransition(async () => {
      change({ type: "add", quote: draft });
      const result = await addQuote(bookId, parsed.data);
      if (!result.ok) {
        toast.error(result.error);
        // Devolve o texto para a pessoa não perder o que escreveu
        setText(draft.text);
        setPage(draft.page === null ? "" : String(draft.page));
      }
    });
  }

  function remove(quoteId: string) {
    startTransition(async () => {
      change({ type: "remove", id: quoteId });
      const result = await removeQuote(quoteId);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium">Citações</h3>
      {quotes.length > 0 ? (
        <ul className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {quotes.map((quote) => (
              <motion.li
                key={quote.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: tweens.fast }}
                transition={springs.smooth}
                className="group flex items-start gap-3 rounded-card border border-border px-4 py-3"
              >
                <figure className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <blockquote className="font-serif text-lg leading-snug text-pretty">
                    “{quote.text}”
                  </blockquote>
                  {quote.page !== null ? (
                    <figcaption className="font-mono text-xs text-muted-foreground">
                      p. {formatNumber(quote.page)}
                    </figcaption>
                  ) : null}
                </figure>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Apagar citação"
                  onClick={() => remove(quote.id)}
                  className="shrink-0"
                >
                  <X />
                </Button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : null}

      <form onSubmit={add} noValidate className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-trecho`} className="sr-only">
            Trecho
          </Label>
          <Textarea
            id={`${id}-trecho`}
            value={text}
            maxLength={1000}
            placeholder="O trecho que você quer guardar"
            onChange={(event) => setText(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-erro` : undefined}
            className="min-h-20"
          />
        </div>
        <div className="flex items-end gap-3">
          <div className="flex w-28 flex-col gap-1.5">
            <Label htmlFor={`${id}-pagina`}>Página</Label>
            <Input
              id={`${id}-pagina`}
              inputMode="numeric"
              value={page}
              placeholder={pageCount ? `de ${formatNumber(pageCount)}` : ""}
              onChange={(event) =>
                setPage(event.target.value.replace(/\D/g, "").slice(0, 5))
              }
            />
          </div>
          <Button type="submit" variant="outline" className="h-10">
            Guardar citação
          </Button>
        </div>
        {error ? (
          <p
            id={`${id}-erro`}
            role="alert"
            className="text-xs text-destructive"
          >
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
