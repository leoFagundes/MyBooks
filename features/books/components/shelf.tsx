"use client";

import type { Route } from "next";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { neighborShift } from "../lib/spine";
import type { BookVisual } from "../types";
import { BookSpine } from "./book-spine";

type ShelfProps = {
  books: BookVisual[];
  label?: string;
  /** Para onde cada lombada leva (padrão: a página do livro). */
  bookHref?: (book: BookVisual) => Route;
  /**
   * O que fica logo abaixo da linha, sob cada lombada (o Copiar, na estante
   * de outra pessoa). Com ele, o destaque segue o ponteiro e o foco no item
   * inteiro, para dar tempo de chegar ao que está embaixo.
   */
  accessory?: (book: BookVisual, active: boolean) => React.ReactNode;
  className?: string;
};

/**
 * Prateleira minimalista, sem madeira (spec §4): as lombadas apoiadas numa
 * linha fina, quebrando em fileiras conforme a largura. Em destaque, a
 * lombada sobe e as vizinhas da mesma fileira se afastam.
 */
export function Shelf({
  books,
  label = "Prateleira",
  bookHref,
  accessory,
  className,
}: ShelfProps) {
  const [active, setActive] = useState<number | null>(null);
  const [rowTops, setRowTops] = useState<number[]>([]);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  function activate(index: number) {
    // As fileiras dependem da largura: mede na hora, só no hover/foco
    setRowTops(items.current.map((item) => item?.offsetTop ?? 0));
    setActive(index);
  }

  function deactivate(index: number) {
    setActive((current) => (current === index ? null : current));
  }

  function shiftOf(index: number) {
    if (active === null || rowTops[index] !== rowTops[active]) return 0;
    return neighborShift(index - active);
  }

  return (
    <ul
      aria-label={label}
      className={cn("shelf flex flex-wrap items-end gap-x-1", className)}
    >
      {books.map((book, index) => (
        <li
          key={book.id}
          ref={(node) => {
            items.current[index] = node;
          }}
          data-copy-item={accessory ? "" : undefined}
          className={cn(
            "flex h-(--shelf-row) items-end",
            accessory && "relative",
          )}
          onFocus={accessory ? () => activate(index) : undefined}
          onBlur={
            accessory
              ? (event) => {
                  if (!event.currentTarget.contains(event.relatedTarget))
                    deactivate(index);
                }
              : undefined
          }
          onPointerLeave={
            accessory
              ? (event) => {
                  // O foco no chip segura o destaque
                  if (!event.currentTarget.contains(document.activeElement))
                    deactivate(index);
                }
              : undefined
          }
        >
          <BookSpine
            book={book}
            href={bookHref?.(book)}
            lifted={active === index}
            shift={shiftOf(index)}
            onActivate={() => activate(index)}
            onDeactivate={accessory ? undefined : () => deactivate(index)}
          />
          {accessory ? (
            <div className="absolute top-full left-1/2 z-10 flex -translate-x-1/2 justify-center pt-1.5">
              {accessory(book, active === index)}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
