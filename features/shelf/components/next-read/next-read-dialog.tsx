"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Shuffle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyShelfIllustration } from "@/components/ui/illustrations";
import type { BookVisual } from "@/features/books/types";
import { formatNumber } from "@/lib/format";
import { tweens } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { pickRandom } from "../../lib/pick-random";
import { fetchWantList, WANT_LIST_KEY } from "../../lib/want-list";
import { byline } from "../add-book/chosen-book";
import { CardDeck } from "./card-deck";
import { DeckSkeleton } from "./deck-skeleton";

type DrawActions = {
  onStart: (book: BookVisual) => void;
  onClose: () => void;
};

// Some com a saída mais rápida que a entrada (spec §3)
const fade = (visible: boolean) => ({
  opacity: visible ? 1 : 0,
  transition: visible ? tweens.base : tweens.fast,
});

function Draw({
  books,
  onStart,
  onClose,
}: DrawActions & { books: BookVisual[] }) {
  const [draw, setDraw] = useState(() => ({
    round: 0,
    book: pickRandom(books),
  }));
  const [revealed, setRevealed] = useState(false);
  const startButton = useRef<HTMLButtonElement>(null);
  const { book } = draw;

  // Quando a carta vira, o teclado já está em "Começar a ler"
  useEffect(() => {
    if (revealed) startButton.current?.focus();
  }, [revealed]);

  function again() {
    setRevealed(false);
    setDraw((current) => ({
      round: current.round + 1,
      book: pickRandom(books, current.book),
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="py-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={draw.round}
            initial={{ opacity: 0 }}
            animate={fade(true)}
            exit={fade(false)}
          >
            <CardDeck
              book={book}
              count={books.length}
              onRevealed={() => setRevealed(true)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        aria-live="polite"
        className="flex min-h-16 flex-col items-center justify-center gap-1 text-center"
      >
        {revealed ? (
          <motion.div
            key={book.id}
            className="flex flex-col items-center gap-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: tweens.base }}
          >
            <p className="font-serif text-2xl leading-tight tracking-tight text-balance">
              {book.title}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {byline(book)}
            </p>
          </motion.div>
        ) : (
          <p className="font-mono text-xs text-muted-foreground">
            {books.length === 1
              ? "Só um livro na fila…"
              : `Embaralhando ${formatNumber(books.length)} livros…`}
          </p>
        )}
      </div>

      {/* Os botões guardam o lugar desde o começo: a janela não pula */}
      <motion.div
        inert={!revealed}
        initial={{ opacity: 0 }}
        animate={fade(revealed)}
        className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center"
      >
        <Button ref={startButton} onClick={() => onStart(book)}>
          <BookOpen />
          Começar a ler
        </Button>
        <Button variant="outline" asChild>
          <Link href={routes.book(book.id)} onClick={onClose}>
            Ver o livro
          </Link>
        </Button>
        {books.length > 1 ? (
          <Button variant="ghost" onClick={again}>
            <Shuffle />
            Sortear de novo
          </Button>
        ) : null}
      </motion.div>
    </div>
  );
}

/**
 * O corpo do sorteio, baixado só quando alguém abre: busca a fila de Quero
 * ler (se não veio pronta), e mostra o baralho, a fila vazia ou o erro.
 */
export function NextReadDialog({
  books,
  onStart,
  onFindBook,
  onClose,
}: DrawActions & {
  /** Os livros do sorteio; null busca a fila de Quero ler. */
  books: BookVisual[] | null;
  onFindBook: () => void;
}) {
  const queue = useQuery({
    queryKey: WANT_LIST_KEY,
    queryFn: ({ signal }) => fetchWantList(signal),
    enabled: books === null,
    // Cada vez que abre, a fila de agora
    staleTime: 0,
  });
  const list = books ?? queue.data ?? null;

  if (list === null) {
    return queue.isError ? (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p role="alert" className="text-sm text-pretty">
          Não deu para buscar sua fila agora.
        </p>
        <Button variant="outline" onClick={() => void queue.refetch()}>
          Tentar de novo
        </Button>
      </div>
    ) : (
      <DeckSkeleton />
    );
  }
  if (list.length === 0) {
    return (
      <EmptyState
        illustration={EmptyShelfIllustration}
        title="Sua fila de leitura está vazia"
        description="Ponha em Quero ler os livros que você tem vontade de ler, e o sorteio escolhe um deles."
        action={<Button onClick={onFindBook}>Procurar um livro</Button>}
      />
    );
  }
  return <Draw books={list} onStart={onStart} onClose={onClose} />;
}
