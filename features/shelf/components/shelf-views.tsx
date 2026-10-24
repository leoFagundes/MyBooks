"use client";

import { LayoutGrid, LibraryBig, List } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  type Variants,
} from "motion/react";
import Link from "next/link";
import { useId, useState } from "react";
import type { SegmentedOption } from "@/components/ui/segmented-control";
import { BookCover } from "@/features/books/components/book-cover";
import { Shelf } from "@/features/books/components/shelf";
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

type ShelfViewsProps = {
  books: BookVisual[];
  view: ShelfView;
  className?: string;
};

/**
 * As três visualizações do perfil (spec §5): Estante (lombadas), Grade
 * (capas) e Lista (tabela compacta), com transição entre elas (spec §3,
 * momento 2).
 */
export function ShelfViews({ books, view, className }: ShelfViewsProps) {
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
              <Shelf books={books} label="Estante" />
            ) : view === "grade" ? (
              <CoverGrid books={books} />
            ) : (
              <BookTable books={books} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
}

function CoverGrid({ books }: { books: BookVisual[] }) {
  return (
    <ul
      aria-label="Grade de capas"
      className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6"
    >
      {books.map((book) => (
        <li key={book.id}>
          <Link
            href={routes.book(book.id)}
            aria-label={book.title}
            className="block rounded-cover"
          >
            <BookCover book={book} size="fill" layoutId={`capa-${book.id}`} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BookTable({ books }: { books: BookVisual[] }) {
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
          <tr key={book.id} className="group">
            <td className="py-2 pr-4 align-middle">
              <BookCover
                book={book}
                size="xs"
                tilt={false}
                layoutId={`capa-${book.id}`}
              />
            </td>
            <motion.td variants={textVariants} className={cn(cell, "pr-4")}>
              <Link
                href={routes.book(book.id)}
                className="font-serif text-lg leading-tight text-balance hover:underline hover:decoration-border-strong hover:underline-offset-4"
              >
                {book.title}
              </Link>
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
        ))}
      </tbody>
    </table>
  );
}
