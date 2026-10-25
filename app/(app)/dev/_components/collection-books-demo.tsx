"use client";

import type { Route } from "next";
import { useState } from "react";
import { EmptyShelfIllustration } from "@/components/ui/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SortableBooks } from "@/features/collections/components/sortable-books";
import { applyMovePlan } from "@/features/collections/lib/position";
import type { CollectionItemVisual } from "@/features/collections/types";

const viewers = [
  { value: "dona", label: "Dona" },
  { value: "visitante", label: "Visitante" },
] as const;
type Viewer = (typeof viewers)[number]["value"];

const idOf = (item: CollectionItemVisual) => item.book.id;
// Na demonstração, as capas abrem a página de demonstração do livro
const toDemoBook = (book: { id: string }) => `/dev/livro/${book.id}` as Route;

/** A grade da coleção de exemplo com estado local: nada é salvo. */
export function CollectionBooksDemo({
  items: initial,
}: {
  items: CollectionItemVisual[];
}) {
  const [items, setItems] = useState(initial);
  const [viewer, setViewer] = useState<Viewer>("dona");

  if (items.length === 0) {
    return (
      <EmptyState
        illustration={EmptyShelfIllustration}
        title="Nenhum livro ainda"
        description="Comece pelo livro que fez você pensar nesta coleção."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <SegmentedControl
        aria-label="Ver como"
        value={viewer}
        onValueChange={setViewer}
        options={viewers}
        className="self-start"
      />
      <SortableBooks
        items={items}
        editable={viewer === "dona"}
        bookHref={toDemoBook}
        onMove={(plan) =>
          setItems((current) => applyMovePlan(current, plan, idOf))
        }
        onNote={(bookId, note) =>
          setItems((current) =>
            current.map((item) =>
              item.book.id === bookId ? { ...item, note } : item,
            ),
          )
        }
      />
    </div>
  );
}
