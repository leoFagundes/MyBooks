"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { sampleBooks } from "@/features/books/sample-books";
import {
  type ShelfView,
  ShelfViews,
  shelfViewOptions,
} from "@/features/shelf/components/shelf-views";

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
      <ShelfViews books={sampleBooks} view={view} />
    </>
  );
}
