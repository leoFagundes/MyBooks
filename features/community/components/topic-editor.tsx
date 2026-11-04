"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, fieldClasses } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { BookVisual } from "@/features/books/types";
import { routes } from "@/lib/routes";
import { useMediaQuery } from "@/lib/use-media-query";
import { createTopic, updateTopic } from "../actions";
import type { ForumCategory } from "../types";
import { MarkdownEditor } from "./markdown-editor";

export type TopicDraft = {
  category: string;
  title: string;
  body: string;
  tags: string;
  containsSpoilers: boolean;
  books: BookVisual[];
};

export const emptyDraft = (
  category = "geral",
  books: BookVisual[] = [],
): TopicDraft => ({
  category,
  title: "",
  body: "",
  tags: "",
  containsSpoilers: false,
  books,
});

const hasContent = (draft: TopicDraft) =>
  Boolean(draft.title.trim() || draft.body.trim() || draft.tags.trim());

/**
 * O rascunho guardado no navegador, se ainda servir. O livro da página de
 * onde a pessoa abriu entra junto, se faltar (até 5).
 */
function storedDraft(key: string, initial: TopicDraft): TopicDraft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<TopicDraft>;
    if (typeof saved.title !== "string" || typeof saved.body !== "string") {
      return null;
    }
    const draft: TopicDraft = {
      category:
        typeof saved.category === "string" ? saved.category : initial.category,
      title: saved.title,
      body: saved.body,
      tags: typeof saved.tags === "string" ? saved.tags : "",
      containsSpoilers: saved.containsSpoilers === true,
      books: Array.isArray(saved.books) ? saved.books : [],
    };
    for (const book of initial.books) {
      if (!draft.books.some((item) => item.id === book.id)) {
        draft.books = [...draft.books, book].slice(0, 5);
      }
    }
    return hasContent(draft) ? draft : null;
  } catch {
    return null;
  }
}

function saveDraft(key: string, draft: TopicDraft) {
  try {
    if (hasContent(draft)) {
      window.localStorage.setItem(key, JSON.stringify(draft));
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Sem armazenamento (aba privada): o rascunho vale só enquanto a gaveta
    // estiver aberta
  }
}

/** Se dá para guardar no navegador (aba privada e bloqueio não deixam). */
function storageWorks() {
  try {
    const probe = "mybooks:teste";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Abrir ou editar um tópico (MELHORIAS 8), numa gaveta: de baixo no celular,
 * do lado no resto. Categoria, título, texto com a prévia, livros vinculados
 * (aparecem na página deles), tags e o aviso de spoilers. O tópico novo
 * guarda o rascunho no navegador (`draftKey`, por conta) a cada mudança:
 * fechar a gaveta, recarregar ou sair da página não perde o texto.
 */
export function TopicEditor({
  open,
  onOpenChange,
  categories,
  initial,
  topicId,
  draftKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ForumCategory[];
  initial: TopicDraft;
  /** Editando: o tópico. Sem ele, é um tópico novo. */
  topicId?: string;
  /** Onde guardar o rascunho do tópico novo. */
  draftKey?: string;
}) {
  const wide = useMediaQuery("(min-width: 640px)");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        aria-describedby={undefined}
        className="sm:max-w-xl"
      >
        <SheetHeader>
          <SheetTitle>{topicId ? "Editar tópico" : "Novo tópico"}</SheetTitle>
        </SheetHeader>
        {open ? (
          <TopicForm
            categories={categories}
            initial={initial}
            topicId={topicId}
            draftKey={topicId ? undefined : draftKey}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function TopicForm({
  categories,
  initial,
  topicId,
  draftKey,
  onDone,
}: {
  categories: ForumCategory[];
  initial: TopicDraft;
  topicId?: string;
  draftKey?: string;
  onDone: () => void;
}) {
  const id = useId();
  const router = useRouter();
  // A gaveta só monta o formulário aberta, no navegador: ler aqui não
  // desencontra a hidratação
  const [restored, setRestored] = useState(() =>
    draftKey ? storedDraft(draftKey, initial) : null,
  );
  const [draft, setDraft] = useState(restored ?? initial);
  const [canStore] = useState(() => (draftKey ? storageWorks() : false));
  const saved = canStore && hasContent(draft);

  useEffect(() => {
    if (draftKey) saveDraft(draftKey, draft);
  }, [draftKey, draft]);

  function discard() {
    if (draftKey) saveDraft(draftKey, initial);
    setRestored(null);
    setDraft(initial);
  }
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bookMap = Object.fromEntries(
    draft.books.map((book) => [book.id, book]),
  );

  const set = <K extends keyof TopicDraft>(key: K, value: TopicDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function addBook(book: BookVisual) {
    setDraft((current) =>
      current.books.some((item) => item.id === book.id) ||
      current.books.length >= 5
        ? current
        : { ...current, books: [...current.books, book] },
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const input = {
        category: draft.category,
        title: draft.title,
        body: draft.body,
        tags: draft.tags,
        containsSpoilers: draft.containsSpoilers,
        bookIds: draft.books.map((book) => book.id),
      };
      const result = topicId
        ? await updateTopic(topicId, input)
        : await createTopic(input);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setError(result.error);
        return;
      }
      toast.success(topicId ? "Tópico atualizado" : "Tópico publicado");
      // Publicado, o rascunho sai (antes de a gaveta fechar e o efeito parar)
      if (draftKey) saveDraft(draftKey, emptyDraft());
      onDone();
      if (topicId) router.refresh();
      else if (result.data)
        router.push(routes.topic((result.data as { id: string }).id));
    });
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <div className="-mx-6 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-6 py-1">
        {restored ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-border bg-muted px-3 py-2 text-sm">
            <span>Rascunho recuperado: continue de onde parou.</span>
            <Button type="button" variant="ghost" size="sm" onClick={discard}>
              Descartar rascunho
            </Button>
          </div>
        ) : null}
        {topicId ? null : (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-categoria`}>Categoria</Label>
            <select
              id={`${id}-categoria`}
              value={draft.category}
              onChange={(event) => set("category", event.target.value)}
              className={`${fieldClasses} h-10`}
            >
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-titulo`}>Título</Label>
          <Input
            id={`${id}-titulo`}
            value={draft.title}
            maxLength={140}
            placeholder="Sobre o que você quer conversar?"
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? `${id}-titulo-erro` : undefined}
            onChange={(event) => set("title", event.target.value)}
          />
          {errors.title ? (
            <p id={`${id}-titulo-erro`} className="text-xs text-destructive">
              {errors.title}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-texto`}>Texto</Label>
          <MarkdownEditor
            id={`${id}-texto`}
            value={draft.body}
            onChange={(body) => set("body", body)}
            books={bookMap}
            onBook={addBook}
            maxLength={20000}
            headings
            mentions
            invalid={Boolean(errors.body)}
            describedBy={errors.body ? `${id}-texto-erro` : undefined}
          />
          {errors.body ? (
            <p id={`${id}-texto-erro`} className="text-xs text-destructive">
              {errors.body}
            </p>
          ) : null}
        </div>
        {draft.books.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Livros do tópico</p>
            <ul className="flex flex-wrap gap-2">
              {draft.books.map((book) => (
                <li
                  key={book.id}
                  className="flex items-center gap-1 rounded-full border border-border py-0.5 pr-1 pl-3 text-sm"
                >
                  <span className="line-clamp-1 font-serif">{book.title}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Tirar ${book.title}`}
                    onClick={() =>
                      set(
                        "books",
                        draft.books.filter((item) => item.id !== book.id),
                      )
                    }
                  >
                    <X className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-tags`}>Tags (separe com vírgula)</Label>
          <Input
            id={`${id}-tags`}
            value={draft.tags}
            placeholder="fantasia, clube do livro"
            onChange={(event) => set("tags", event.target.value)}
          />
        </div>
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={draft.containsSpoilers}
            onChange={(event) => set("containsSpoilers", event.target.checked)}
            className="size-4 accent-foreground"
          />
          Contém spoilers (o texto fica escondido até a pessoa escolher ver)
        </label>
        <div aria-live="polite">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>
      <SheetFooter className="flex-row items-center justify-end">
        {draftKey ? (
          <p
            aria-live="polite"
            className="mr-auto font-mono text-xs text-muted-foreground"
          >
            {saved ? "Rascunho salvo" : null}
          </p>
        ) : null}
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Publicando…" : topicId ? "Salvar" : "Publicar"}
        </Button>
      </SheetFooter>
    </form>
  );
}
