"use client";

import type { Route } from "next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { sampleBooks } from "@/features/books/sample-books";
import type { BookVisual } from "@/features/books/types";
import {
  ShelfViews,
  shelfViewOptions,
  useShelfViewSwitch,
} from "@/features/shelf/components/shelf-views";

// Na vitrine, os livros de exemplo abrem a página de demonstração do livro
// (as cópias da estante grande abrem a do original)
const toDemoPage = (book: BookVisual) =>
  `/dev/livro/${book.id.replace(/--\d+$/, "")}` as Route;

// A estante grande: os livros de exemplo repetidos até 300, para medir a
// troca de vista com muitos livros (a meta é 60fps)
const manyBooks: BookVisual[] = Array.from({ length: 300 }, (_, index) => {
  const book = sampleBooks[index % sampleBooks.length];
  return {
    ...book,
    id: `${book.id}--${index}`,
    pageCount: 80 + ((index * 37) % 700),
  };
});

export function ViewsDemo() {
  const views = useShelfViewSwitch("estante");
  const [many, setMany] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          aria-label="Visualização"
          value={views.view}
          onValueChange={views.change}
          options={shelfViewOptions}
        />
        <Button
          variant="outline"
          size="sm"
          aria-pressed={many}
          onClick={() => setMany((current) => !current)}
        >
          {many ? "Voltar a 15 livros" : "Testar com 300 livros"}
        </Button>
      </div>
      <ShelfViews
        books={many ? manyBooks : sampleBooks}
        switcher={views}
        bookHref={toDemoPage}
      />
    </>
  );
}
