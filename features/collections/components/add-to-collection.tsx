"use client";

import { Check, LibraryBig } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { BookVisual } from "@/features/books/types";
import { cn } from "@/lib/utils";
import {
  addBookToCollection,
  createCollection,
  removeFromCollection,
} from "../actions";
import type { EditableCollection } from "../queries";
import { COLLECTION_LIMITS } from "../schemas";

type Change =
  | { type: "toggle"; id: string; hasBook: boolean }
  | { type: "create"; collection: EditableCollection };

function apply(current: EditableCollection[], change: Change) {
  return change.type === "create"
    ? [change.collection, ...current]
    : current.map((collection) =>
        collection.id === change.id
          ? { ...collection, hasBook: change.hasBook }
          : collection,
      );
}

/**
 * "Pôr numa coleção" na página do livro: as coleções que a pessoa edita,
 * marcadas quando o livro já está nelas (apertar põe ou tira, na hora), e
 * uma coleção nova só com o título, que já nasce com o livro.
 */
export function AddToCollection({
  book,
  collections,
}: {
  book: BookVisual;
  collections: EditableCollection[];
}) {
  const [list, change] = useOptimistic(collections, apply);
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState("");

  function toggle(collection: EditableCollection) {
    const hasBook = !collection.hasBook;
    startTransition(async () => {
      change({ type: "toggle", id: collection.id, hasBook });
      const result = hasBook
        ? await addBookToCollection(collection.id, { catalogId: book.id })
        : await removeFromCollection(collection.id, book.id);
      if (!result.ok) {
        toast(result.error, { description: collection.title });
        return;
      }
      toast(
        hasBook ? `Em ${collection.title}` : `Tirei de ${collection.title}`,
        { description: book.title },
      );
    });
  }

  function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = title.trim();
    if (!name) return;
    setTitle("");
    startTransition(async () => {
      change({
        type: "create",
        collection: { id: "nova", title: name, emoji: null, hasBook: true },
      });
      const created = await createCollection({
        title: name,
        description: null,
        emoji: null,
        visibility: "public",
        isCollaborative: false,
      });
      if (!created.ok) {
        toast(created.error);
        setTitle(name);
        return;
      }
      const added = await addBookToCollection(created.data.id, {
        catalogId: book.id,
      });
      if (!added.ok) toast(added.error, { description: name });
      else toast(`Em ${name}`, { description: book.title });
    });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="self-start">
          <LibraryBig />
          Pôr numa coleção
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 gap-2 p-2">
        <p className="px-2 pt-1.5 font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          Suas coleções
        </p>
        {list.length === 0 ? (
          <p className="px-2 pb-1 text-sm text-pretty text-muted-foreground">
            Você ainda não tem coleções. Comece uma aqui embaixo, já com este
            livro.
          </p>
        ) : (
          <ul aria-label="Suas coleções" className="flex flex-col">
            {list.map((collection) => (
              <li key={collection.id}>
                <button
                  type="button"
                  aria-pressed={collection.hasBook}
                  disabled={collection.id === "nova"}
                  onClick={() => toggle(collection)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2.5 rounded-control px-2 py-2 text-left text-sm transition-colors hover:bg-muted disabled:cursor-default",
                  )}
                >
                  <span aria-hidden className="w-5 text-center">
                    {collection.emoji ?? "📚"}
                  </span>
                  <span className="line-clamp-2 min-w-0 flex-1 text-pretty">
                    {collection.title}
                  </span>
                  {collection.hasBook ? (
                    <Check className="size-4 shrink-0" aria-hidden />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          onSubmit={create}
          className="flex gap-2 border-t border-border px-1 pt-3 pb-1"
        >
          <Input
            aria-label="Título da nova coleção"
            placeholder="Nova coleção"
            value={title}
            maxLength={COLLECTION_LIMITS.title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Button type="submit" variant="outline" disabled={!title.trim()}>
            Criar
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
