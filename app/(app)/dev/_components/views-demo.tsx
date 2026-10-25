"use client";

import type { Route } from "next";
import { useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { sampleBooks } from "@/features/books/sample-books";
import type { BookVisual } from "@/features/books/types";
import {
  type ShelfView,
  ShelfViews,
  shelfViewOptions,
} from "@/features/shelf/components/shelf-views";

// Na vitrine, os livros de exemplo abrem a página de demonstração do livro
const toDemoPage = (book: BookVisual) => `/dev/livro/${book.id}` as Route;

export function ViewsDemo() {
  const [view, setView] = useState<ShelfView>("estante");

  return (
    <>
      <SegmentedControl
        aria-label="Visualização"
        value={view}
        onValueChange={setView}
        options={shelfViewOptions}
        className="self-start"
      />
      <ShelfViews books={sampleBooks} view={view} bookHref={toDemoPage} />
    </>
  );
}
