"use client";

import { useState } from "react";
import { useCommandPalette } from "@/components/shell/command-palette";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyShelfIllustration } from "@/components/ui/illustrations";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { BookVisual } from "@/features/books/types";
import { type ShelfView, ShelfViews, shelfViewOptions } from "./shelf-views";

/** A estante de quem está vendo, nas três visualizações. */
export function MyShelf({ books }: { books: BookVisual[] }) {
  const [view, setView] = useState<ShelfView>("estante");
  const palette = useCommandPalette();

  if (books.length === 0) {
    return (
      <EmptyState
        illustration={EmptyShelfIllustration}
        title="Sua estante está esperando"
        description="Procure um livro que você leu ou quer ler e comece por ele."
        action={<Button onClick={palette.toggle}>Procurar um livro</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl
        aria-label="Visualização"
        value={view}
        onValueChange={setView}
        options={shelfViewOptions}
        className="self-start"
      />
      <ShelfViews books={books} view={view} />
    </div>
  );
}
