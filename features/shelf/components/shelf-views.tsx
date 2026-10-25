"use client";

import { LayoutGrid, LibraryBig, List } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  type Variants,
} from "motion/react";
import type { Route } from "next";
import { useId, useState, ViewTransition } from "react";
import type { SegmentedOption } from "@/components/ui/segmented-control";
import { BookCover } from "@/features/books/components/book-cover";
import { BookLink } from "@/features/books/components/book-link";
import { useTransitionSource } from "@/features/books/components/cover-transition";
import { Shelf } from "@/features/books/components/shelf";
import { titleName } from "@/features/books/lib/transition-names";
import type { BookVisual } from "@/features/books/types";
import { formatNumber } from "@/lib/format";
import { tweens } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export type ShelfView = "estante" | "grade" | "lista";

export const shelfViewOptions = [
  { value: "estante", label: "Estante", icon: LibraryBig },
  { value: "grade", label: "Grade", icon: LayoutGrid },
  { value: "lista", label: "Lista", icon: List },
] as const satisfies readonly SegmentedOption<ShelfView>[];

const hasCovers = (view: ShelfView) => view !== "estante";

// Entre grade e lista as capas viajam (layoutId), então a vista em si não
// esmaece; de ou para a estante, que não tem capas, as vistas se cruzam.
const viewVariants: Variants = {
  hidden: (travels: boolean) => ({ opacity: travels ? 1 : 0 }),
  visible: { opacity: 1, transition: tweens.base },
  exit: (travels: boolean) => ({
    opacity: travels ? 1 : 0,
    transition: tweens.fast,
  }),
};

// O que não viaja (títulos, colunas) entra e sai esmaecendo
const textVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: tweens.base },
  exit: { opacity: 0, transition: tweens.fast },
};

type BookHref = (book: BookVisual) => Route;

const toBookPage: BookHref = (book) => routes.book(book.id);

type ShelfViewsProps = {
  books: BookVisual[];
  view: ShelfView;
  /** Para onde cada livro leva (padrão: a página do livro). */
  bookHref?: BookHref;
  className?: string;
};

/**
 * As três visualizações do perfil (spec §5): Estante (lombadas), Grade
 * (capas) e Lista (tabela compacta), com transição entre elas (spec §3,
 * momento 2).
 */
export function ShelfViews({
  books,
  view,
  bookHref = toBookPage,
  className,
}: ShelfViewsProps) {
  const group = useId();
  const [current, setCurrent] = useState(view);
  const [previous, setPrevious] = useState<ShelfView | null>(null);
  if (view !== current) {
    setPrevious(current);
    setCurrent(view);
  }
  const travels = previous !== null && hasCovers(previous) && hasCovers(view);

  return (
    // O grupo isola os layoutIds de outras listas de capas na mesma página
    <LayoutGroup id={group}>
      <div className={cn("relative", className)}>
        <AnimatePresence mode="popLayout" initial={false} custom={travels}>
          <motion.div
            key={view}
            custom={travels}
            variants={viewVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {view === "estante" ? (
              <Shelf books={books} label="Estante" bookHref={bookHref} />
            ) : view === "grade" ? (
              <CoverGrid books={books} bookHref={bookHref} />
            ) : (
              <BookTable books={books} bookHref={bookHref} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}

function CoverGrid({
  books,
  bookHref,
}: {
  books: BookVisual[];
  bookHref: BookHref;
}) {
  return (
    <ul
      aria-label="Grade de capas"
      className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6"
    >
      {books.map((book) => (
        <li key={book.id}>
          <BookLink
            bookId={book.id}
            href={bookHref(book)}
            aria-label={book.title}
            className="block rounded-cover"
          >
            <BookCover book={book} size="fill" layoutId={`capa-${book.id}`} />
          </BookLink>
        </li>
      ))}
    </ul>
  );
}

function BookTable({
  books,
  bookHref,
}: {
  books: BookVisual[];
  bookHref: BookHref;
}) {
  // As linhas ficam nas células de texto, que esmaecem; a capa viaja sozinha.
  // Bordas separadas: coladas, quem pinta é a tabela, e elas não esmaeceriam.
  const cell = "border-b border-border py-3 group-last:border-b-0";

  return (
    <table
      aria-label="Lista de livros"
      className="w-full border-separate border-spacing-0 text-left"
    >
      <motion.thead variants={textVariants}>
        <tr className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          <th scope="col" className="w-14 pb-2 font-normal">
            <span className="sr-only">Capa</span>
          </th>
          <th scope="col" className="pb-2 font-normal">
            Livro
          </th>
          <th scope="col" className="hidden pb-2 font-normal sm:table-cell">
            Ano
          </th>
          <th scope="col" className="pb-2 text-right font-normal">
            Páginas
          </th>
        </tr>
      </motion.thead>
      <tbody>
        {books.map((book) => (
          <BookRow
            key={book.id}
            book={book}
            href={bookHref(book)}
            cell={cell}
          />
        ))}
      </tbody>
    </table>
  );
}

function BookRow({
  book,
  href,
  cell,
}: {
  book: BookVisual;
  href: Route;
  cell: string;
}) {
  // Capa e título da linha são a mesma origem: os dois viajam juntos
  const source = useTransitionSource(book.id);

  return (
    <tr className="group">
      <td className="py-2 pr-4 align-middle">
        {/* O título já é o link para leitores de tela e teclado */}
        <BookLink
          bookId={book.id}
          href={href}
          source={source}
          tabIndex={-1}
          aria-hidden
          className="block rounded-cover"
        >
          <BookCover
            book={book}
            size="xs"
            tilt={false}
            layoutId={`capa-${book.id}`}
          />
        </BookLink>
      </td>
      <motion.td variants={textVariants} className={cn(cell, "pr-4")}>
        <BookLink
          bookId={book.id}
          href={href}
          source={source}
          className="font-serif text-lg leading-tight tracking-tight"
        >
          {/* Uma caixa só, do tamanho do texto, como o título do topo */}
          <ViewTransition
            name={source.isSource ? titleName(book.id) : undefined}
            share="titulo"
            default="none"
          >
            <span className="inline-block text-balance hover:underline hover:decoration-border-strong hover:underline-offset-4">
              {book.title}
            </span>
          </ViewTransition>
        </BookLink>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {book.authors.join(", ")}
        </p>
      </motion.td>
      <motion.td
        variants={textVariants}
        className={cn(
          cell,
          "hidden pr-4 font-mono text-xs text-muted-foreground sm:table-cell",
        )}
      >
        {book.publishedYear ?? "—"}
      </motion.td>
      <motion.td
        variants={textVariants}
        className={cn(
          cell,
          "text-right font-mono text-xs text-muted-foreground",
        )}
      >
        {book.pageCount === null ? "—" : formatNumber(book.pageCount)}
      </motion.td>
    </tr>
  );
}
