"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { neighborShift } from "../lib/spine";
import type { BookVisual } from "../types";
import { BookSpine } from "./book-spine";

type ShelfProps = {
  books: BookVisual[];
  label?: string;
  className?: string;
};

/**
 * Prateleira minimalista, sem madeira (spec §4): as lombadas apoiadas numa
 * linha fina, quebrando em fileiras conforme a largura. Em destaque, a
 * lombada sobe e as vizinhas da mesma fileira se afastam.
 */
export function Shelf({ books, label = "Prateleira", className }: ShelfProps) {
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
          className="flex h-(--shelf-row) items-end"
        >
          <BookSpine
            book={book}
            lifted={active === index}
            shift={shiftOf(index)}
            onActivate={() => activate(index)}
            onDeactivate={() => deactivate(index)}
          />
        </li>
      ))}
    </ul>
  );
}
