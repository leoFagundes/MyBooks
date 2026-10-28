"use client";

import {
  ArrowLeft,
  LogOutIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { CollectionsIllustration } from "@/components/ui/illustrations";
import { useAddBook } from "@/features/shelf/components/add-book/add-book-provider";
import { routes } from "@/lib/routes";
import {
  addBookToCollection,
  deleteCollection,
  leaveCollection,
  moveCollectionItem,
  rebalanceCollection,
  removeFromCollection,
  saveItemNote,
  setLike,
  setSave,
  updateCollection,
} from "../actions";
import { applyMovePlan, type MovePlan } from "../lib/position";
import type { CollectionPageData } from "../queries";
import type { ItemPlacement } from "../schemas";
import type { CollectionItemVisual, CollectionVisual } from "../types";
import {
  LikeButton,
  LikeCountLink,
  SaveButton,
  ShareButton,
} from "./collection-actions";
import { CollectionForm } from "./collection-form";
import { CollectionHeader } from "./collection-header";
import { SortableBooks } from "./sortable-books";

const firstName = (name: string) => name.split(/\s+/)[0] || name;
const noop = () => {};
const idOf = (item: CollectionItemVisual) => item.book.id;

type ItemsChange =
  | { type: "move"; plan: MovePlan }
  | { type: "note"; bookId: string; note: string | null }
  | { type: "remove"; bookId: string };

function changeItems(items: CollectionItemVisual[], change: ItemsChange) {
  switch (change.type) {
    case "move":
      return applyMovePlan(items, change.plan, idOf);
    case "note":
      return items.map((item) =>
        item.book.id === change.bookId ? { ...item, note: change.note } : item,
      );
    case "remove":
      return items.filter((item) => item.book.id !== change.bookId);
  }
}

/**
 * A página da coleção: o caminho de volta, o cabeçalho com as ações de quem
 * vê e a grade. Mover, anotar e tirar mudam na hora (useOptimistic); se o
 * servidor recusar, a grade volta como estava e um aviso explica.
 */
export function CollectionView({ page }: { page: CollectionPageData }) {
  const { collection, viewer } = page;
  const owner = collection.owner;
  const [items, changeOptimistic] = useOptimistic(page.items, changeItems);
  const [, startTransition] = useTransition();
  const addBook = useAddBook();

  function openPalette() {
    addBook.openForCollection({ id: collection.id, title: collection.title });
  }

  function move(plan: MovePlan) {
    startTransition(async () => {
      changeOptimistic({ type: "move", plan });
      const result =
        plan.kind === "move"
          ? await moveCollectionItem(collection.id, plan.id, plan.position)
          : await rebalanceCollection(collection.id, plan.order);
      if (!result.ok) toast(result.error);
    });
  }

  function note(bookId: string, value: string | null) {
    startTransition(async () => {
      changeOptimistic({ type: "note", bookId, note: value });
      const result = await saveItemNote(collection.id, bookId, value);
      if (!result.ok) toast(result.error);
    });
  }

  function restore(bookId: string, title: string, placement: ItemPlacement) {
    startTransition(async () => {
      const result = await addBookToCollection(
        collection.id,
        { catalogId: bookId },
        placement,
      );
      if (!result.ok) toast(result.error, { description: title });
    });
  }

  function remove(bookId: string) {
    const title = items.find((item) => item.book.id === bookId)?.book.title;
    startTransition(async () => {
      changeOptimistic({ type: "remove", bookId });
      const result = await removeFromCollection(collection.id, bookId);
      if (!result.ok) {
        toast(result.error, { description: title });
        return;
      }
      toast("Tirei da coleção", {
        description: title,
        duration: 6000,
        action: {
          label: "Desfazer",
          onClick: () => restore(bookId, title ?? "", result.data),
        },
      });
    });
  }

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
        <CollectionHeader
          collection={collection}
          actions={
            <div
              role="group"
              aria-label="Ações da coleção"
              className="flex flex-wrap items-center gap-2"
            >
              {viewer.canEdit ? (
                <Button size="sm" onClick={openPalette}>
                  <PlusIcon className="size-4" />
                  Adicionar livro
                </Button>
              ) : null}
              {viewer.signedIn ? (
                <LikeButton
                  liked={viewer.liked}
                  count={collection.likeCount}
                  onToggle={(next) => setLike(collection.id, next)}
                />
              ) : (
                <LikeCountLink count={collection.likeCount} />
              )}
              {viewer.signedIn && !viewer.isOwner ? (
                <SaveButton
                  saved={viewer.saved}
                  onToggle={(next) => setSave(collection.id, next)}
                />
              ) : null}
              <ShareButton
                path={routes.collection(collection.id)}
                title={collection.title}
              />
              {viewer.isOwner ? (
                <>
                  <EditCollectionButton collection={collection} />
                  <DeleteCollectionButton collection={collection} />
                </>
              ) : viewer.isMember ? (
                <LeaveCollectionButton collection={collection} />
              ) : null}
            </div>
          }
        />
      </div>
      {items.length === 0 ? (
        <EmptyState
          illustration={CollectionsIllustration}
          title="Nenhum livro ainda"
          description={
            viewer.canEdit
              ? "Comece pelo livro que fez você pensar nesta coleção."
              : "Esta coleção está esperando o primeiro livro."
          }
          action={
            viewer.canEdit ? (
              <Button onClick={openPalette}>Adicionar livro</Button>
            ) : null
          }
        />
      ) : (
        <SortableBooks
          items={items}
          editable={viewer.canEdit}
          onMove={viewer.canEdit ? move : noop}
          onNote={viewer.canEdit ? note : noop}
          onRemove={viewer.canEdit ? remove : undefined}
        />
      )}
    </>
  );
}

function EditCollectionButton({
  collection,
}: {
  collection: CollectionVisual;
}) {
  return (
    <CollectionForm
      mode="edit"
      trigger={
        <Button variant="ghost" size="sm">
          <PencilIcon className="size-4" />
          Editar
        </Button>
      }
      defaultValues={{
        title: collection.title,
        description: collection.description ?? "",
        emoji: collection.emoji ?? "",
        visibility: collection.visibility,
        isCollaborative: collection.isCollaborative,
      }}
      members={collection.members}
      onSubmit={async (data) => {
        const result = await updateCollection(collection.id, data);
        if (result.ok) toast("Coleção salva");
        return result;
      }}
    />
  );
}

function LeaveCollectionButton({
  collection,
}: {
  collection: CollectionVisual;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      // Na privada, o servidor leva às próprias coleções
      const result = await leaveCollection(collection.id);
      if (result && !result.ok) {
        toast(result.error);
        return;
      }
      setOpen(false);
      toast("Você saiu da coleção", { description: collection.title });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <LogOutIcon className="size-4" />
        Sair da coleção
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sair da coleção?</DialogTitle>
          <DialogDescription>
            Você deixa de editar {collection.title}. Os livros que você pôs
            continuam nela, e @{collection.owner.username} pode convidar você de
            novo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button
            onClick={confirm}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            Sair da coleção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCollectionButton({
  collection,
}: {
  collection: CollectionVisual;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      // Dando certo, o servidor leva às coleções da dona
      const result = await deleteCollection(collection.id);
      if (result && !result.ok) toast(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Trash2Icon className="size-4" />
        Excluir
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir a coleção?</DialogTitle>
          <DialogDescription>
            {collection.title} some para sempre, com a ordem e as notas. Os
            livros continuam nas estantes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button
            onClick={confirm}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            Excluir coleção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
