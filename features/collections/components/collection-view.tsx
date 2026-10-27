"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { CollectionsIllustration } from "@/components/ui/illustrations";
import { routes } from "@/lib/routes";
import type { CollectionPageData } from "../queries";
import { CollectionHeader } from "./collection-header";
import { SortableBooks } from "./sortable-books";

const firstName = (name: string) => name.split(/\s+/)[0] || name;
const noop = () => {};

/** A página da coleção: o caminho de volta, o cabeçalho e a grade de livros. */
export function CollectionView({ page }: { page: CollectionPageData }) {
  const { collection, items, viewer } = page;
  const owner = collection.owner;

  return (
    <>
      <Link
        href={routes.profileTab(owner.username, "colecoes")}
        className="mb-8 inline-flex h-5 items-center gap-1.5 rounded-control text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {viewer.isOwner
          ? "Suas coleções"
          : `Coleções de ${firstName(owner.displayName)}`}
      </Link>
      <div className="mb-12">
        <CollectionHeader collection={collection} />
      </div>
      {items.length === 0 ? (
        <EmptyState
          illustration={CollectionsIllustration}
          title="Nenhum livro ainda"
          description="Esta coleção está esperando o primeiro livro."
        />
      ) : (
        <SortableBooks
          items={items}
          editable={false}
          onMove={noop}
          onNote={noop}
        />
      )}
    </>
  );
}
