"use client";

import { BookmarkPlus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useOptimistic, useRef, useTransition } from "react";
import { toast } from "sonner";
import { useShelfFlight } from "@/components/shell/shelf-flight";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/features/books/components/book-cover";
import { BookLink } from "@/features/books/components/book-link";
import { addBook, removeFromShelf } from "@/features/shelf/actions";
import { actionErrorMessage, unwrapAction } from "@/lib/action";
import { springs, tweens } from "@/lib/motion";
import { routes } from "@/lib/routes";
import type { AffinityPick } from "../queries";

function readBy(pick: AffinityPick) {
  const [first, ...rest] = pick.readers;
  if (!first) return "";
  if (rest.length === 0) return `Lido por @${first.username}`;
  return `Lido por @${first.username} e mais ${rest.length}`;
}

/**
 * "Leitores parecidos leram": livros da estante de quem tem mais afinidade
 * com quem vê e que ela ainda não tem, com o "Quero ler" em um toque (a capa
 * voa até "Minha estante").
 */
export function AffinityPicks({ picks }: { picks: AffinityPick[] }) {
  const { fly } = useShelfFlight();
  const [shown, hide] = useOptimistic(picks, (list, bookId: string) =>
    list.filter((pick) => pick.book.id !== bookId),
  );
  const [, startTransition] = useTransition();

  function want(pick: AffinityPick, cover: Element | null) {
    const { book } = pick;
    if (cover) fly(cover, book);
    startTransition(async () => {
      hide(book.id);
      const adding = unwrapAction(
        addBook({
          book: { catalogId: book.id },
          details: {
            status: "want",
            rating: null,
            startedAt: null,
            finishedAt: null,
          },
        }),
      );
      toast.promise(adding, {
        loading: "Guardando em Quero ler…",
        description: book.title,
        success: () => ({
          message: "Em Quero ler",
          description: book.title,
          duration: 6000,
          action: {
            label: "Desfazer",
            onClick: () => void removeFromShelf(book.id),
          },
        }),
        error: (error: unknown) => ({
          message: actionErrorMessage(error),
          description: book.title,
        }),
      });
      await adding.catch(() => undefined);
    });
  }

  if (shown.length === 0) return null;
  return (
    <section aria-labelledby="parecidos" className="flex flex-col gap-4">
      <h2 id="parecidos" className="font-serif text-xl tracking-tight">
        Leitores parecidos leram
      </h2>
      <ul className="flex flex-col gap-4">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((pick) => (
            <PickRow
              key={pick.book.id}
              pick={pick}
              onWant={(cover) => want(pick, cover)}
            />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
}

function PickRow({
  pick,
  onWant,
}: {
  pick: AffinityPick;
  onWant: (cover: Element | null) => void;
}) {
  const cover = useRef<HTMLDivElement>(null);
  const { book } = pick;
  return (
    <motion.li
      layout
      exit={{ opacity: 0, x: 16, transition: tweens.fast }}
      transition={springs.smooth}
      className="flex items-center gap-3"
    >
      <div ref={cover} className="w-12 shrink-0">
        <BookLink
          book={book}
          href={routes.book(book.id)}
          className="block rounded-cover"
        >
          <BookCover book={book} size="fill" />
        </BookLink>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="line-clamp-2 font-serif leading-tight">{book.title}</p>
        <p className="line-clamp-2 font-mono text-[11px] text-muted-foreground">
          {readBy(pick)}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label={`Quero ler ${book.title}`}
        onClick={() => onWant(cover.current)}
        className="shrink-0"
      >
        <BookmarkPlus aria-hidden />
        <span className="max-sm:sr-only">Quero ler</span>
      </Button>
    </motion.li>
  );
}
