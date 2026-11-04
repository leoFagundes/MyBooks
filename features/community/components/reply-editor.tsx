"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { BookVisual } from "@/features/books/types";
import { useMediaQuery } from "@/lib/use-media-query";
import { createReply, updateReply } from "../actions";
import { MarkdownEditor } from "./markdown-editor";

export type ReplyTarget = {
  topicId: string;
  /** Respondendo a uma resposta (um nível só). */
  parent: { id: string; author: string | null } | null;
  /** Citando uma resposta: o trecho aparece em cima. */
  quote: { id: string; author: string | null; excerpt: string } | null;
  /** Editando a própria resposta. */
  editing: { id: string; body: string } | null;
};

/**
 * Responder, citar ou editar uma resposta (MELHORIAS 8), na gaveta. Ao
 * publicar, a página é pedida de novo e a resposta nova entra na lista.
 */
export function ReplyEditor({
  target,
  books,
  onClose,
  onPosted,
}: {
  target: ReplyTarget | null;
  books: Record<string, BookVisual>;
  onClose: () => void;
  onPosted: (id: string | null) => void;
}) {
  const wide = useMediaQuery("(min-width: 640px)");
  const title = target?.editing
    ? "Editar resposta"
    : target?.parent?.author
      ? `Responder a @${target.parent.author}`
      : "Responder";
  return (
    <Sheet
      open={target !== null}
      onOpenChange={(open) => (open ? null : onClose())}
    >
      <SheetContent
        side={wide ? "right" : "bottom"}
        aria-describedby={undefined}
        className="sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {target ? (
          <ReplyForm
            key={`${target.parent?.id}-${target.quote?.id}-${target.editing?.id}`}
            target={target}
            books={books}
            onClose={onClose}
            onPosted={onPosted}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ReplyForm({
  target,
  books,
  onClose,
  onPosted,
}: {
  target: ReplyTarget;
  books: Record<string, BookVisual>;
  onClose: () => void;
  onPosted: (id: string | null) => void;
}) {
  const id = useId();
  const router = useRouter();
  const [body, setBody] = useState(target.editing?.body ?? "");
  const [cited, setCited] = useState(books);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = target.editing
        ? await updateReply(target.editing.id, body)
        : await createReply({
            topicId: target.topicId,
            body,
            parentId: target.parent?.id ?? null,
            quotedReplyId: target.quote?.id ?? null,
          });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        target.editing ? "Resposta atualizada" : "Resposta publicada",
      );
      onPosted(
        result.data && typeof result.data === "object" && "id" in result.data
          ? (result.data as { id: string }).id
          : null,
      );
      onClose();
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <div className="-mx-6 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 py-1">
        {target.quote ? (
          <blockquote className="border-l-2 border-border-strong pl-3 text-sm text-pretty text-muted-foreground">
            {target.quote.author ? (
              <span className="font-mono text-xs">
                @{target.quote.author}:{" "}
              </span>
            ) : null}
            {target.quote.excerpt}
          </blockquote>
        ) : null}
        <label htmlFor={`${id}-texto`} className="sr-only">
          Sua resposta
        </label>
        <MarkdownEditor
          id={`${id}-texto`}
          value={body}
          onChange={setBody}
          books={cited}
          onBook={(book) =>
            setCited((current) => ({ ...current, [book.id]: book }))
          }
          maxLength={10000}
          mentions
          rows={6}
          placeholder="Escreva a sua resposta"
        />
        <div aria-live="polite">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>
      <SheetFooter className="flex-row justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Publicando…" : target.editing ? "Salvar" : "Responder"}
        </Button>
      </SheetFooter>
    </form>
  );
}
