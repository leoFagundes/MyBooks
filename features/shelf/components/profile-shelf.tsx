"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyShelfIllustration } from "@/components/ui/illustrations";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { BookVisual } from "@/features/books/types";
import { useAddBook } from "./add-book/add-book-provider";
import { type ShelfView, ShelfViews, shelfViewOptions } from "./shelf-views";

/**
 * A estante de alguém nas três visualizações. Vazia, convida quem é dono a
 * começar; nos outros, só conta que ainda não há livros.
 */
export function ProfileShelf({
  books,
  owner,
}: {
  books: BookVisual[];
  /** Primeiro nome de quem é a estante; null quando é de quem está vendo. */
  owner: string | null;
}) {
  const [view, setView] = useState<ShelfView>("estante");
  const addBook = useAddBook();

  if (books.length === 0) {
    return owner === null ? (
      <EmptyState
        illustration={EmptyShelfIllustration}
        title="Sua estante está esperando"
        description="Procure um livro que você leu ou quer ler e comece por ele."
        action={<Button onClick={addBook.open}>Procurar um livro</Button>}
      />
    ) : (
      <EmptyState
        illustration={EmptyShelfIllustration}
        title={`${owner} ainda não pôs livros na estante`}
        description="Quando pôr, eles aparecem aqui."
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
