"use client";

import { useQuery } from "@tanstack/react-query";
import { Flag, PenLine } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { suggestBookDeletion, suggestBookEdit } from "../actions";
import type { SearchResult } from "../lib/search-result";
import type { BookDetails } from "../queries";
import { DELETE_KINDS, type DeleteKind } from "../schemas";

type Open = "editar" | "excluir" | null;

/**
 * "Algo errado neste livro?" (MELHORIAS 7): quem não cadastrou o livro sugere
 * uma edição (o formulário já preenchido; vai só o que mudou) ou a exclusão
 * (duplicado de qual livro, impróprio, inexistente ou outro). A equipe revisa
 * no /admin/moderacao.
 */
export function SuggestBookActions({ book }: { book: BookDetails }) {
  const [open, setOpen] = useState<Open>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="-ml-3 self-start">
            Algo errado neste livro?
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setOpen("editar")}>
            <PenLine />
            Sugerir edição
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setOpen("excluir")}>
            <Flag />
            Sugerir exclusão
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog
        open={open !== null}
        onOpenChange={(next) => (next ? null : setOpen(null))}
      >
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
          {open === "editar" ? (
            <EditForm book={book} onDone={() => setOpen(null)} />
          ) : open === "excluir" ? (
            <DeleteForm book={book} onDone={() => setOpen(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-erro`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ErrorLine({ error }: { error: string | null }) {
  return (
    <div aria-live="polite">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function EditForm({ book, onDone }: { book: BookDetails; onDone: () => void }) {
  const id = useId();
  const [values, setValues] = useState({
    title: book.title,
    subtitle: book.subtitle ?? "",
    authors: book.authors.join(", "),
    publishedYear: book.publishedYear ? String(book.publishedYear) : "",
    pageCount: book.pageCount ? String(book.pageCount) : "",
    isbn: book.isbn13 ?? book.isbn10 ?? "",
    description: book.description ?? "",
    reason: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set =
    (key: keyof typeof values) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const { description, reason, ...fields } = values;
      const result = await suggestBookEdit({
        bookId: book.id,
        fields,
        description,
        reason,
      });
      if (result.ok) {
        toast.success("Sugestão enviada", {
          description: "A equipe revisa e avisa você.",
        });
        onDone();
        return;
      }
      setErrors(
        Object.fromEntries(
          Object.entries(result.fieldErrors ?? {}).map(([key, message]) => [
            key.replace(/^fields\./, ""),
            message,
          ]),
        ),
      );
      setError(result.error);
    });
  }

  const input = (
    key: keyof typeof values,
    extra?: React.ComponentProps<"input">,
  ) => (
    <Input
      id={`${id}-${key}`}
      value={values[key]}
      onChange={set(key)}
      aria-invalid={errors[key] ? true : undefined}
      aria-describedby={errors[key] ? `${id}-${key}-erro` : undefined}
      {...extra}
    />
  );

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>Sugerir edição</DialogTitle>
        <DialogDescription>
          Corrija o que estiver errado. Só o que você mudar vai para a revisão.
        </DialogDescription>
      </DialogHeader>
      <Field id={`${id}-title`} label="Título" error={errors.title}>
        {input("title")}
      </Field>
      <Field id={`${id}-subtitle`} label="Subtítulo" error={errors.subtitle}>
        {input("subtitle")}
      </Field>
      <Field
        id={`${id}-authors`}
        label="Autoria (separe com vírgula)"
        error={errors.authors}
      >
        {input("authors")}
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field
          id={`${id}-publishedYear`}
          label="Ano"
          error={errors.publishedYear}
        >
          {input("publishedYear", {
            inputMode: "numeric",
            className: "font-mono",
          })}
        </Field>
        <Field id={`${id}-pageCount`} label="Páginas" error={errors.pageCount}>
          {input("pageCount", { inputMode: "numeric", className: "font-mono" })}
        </Field>
        <Field id={`${id}-isbn`} label="ISBN" error={errors.isbn}>
          {input("isbn", { inputMode: "numeric", className: "font-mono" })}
        </Field>
      </div>
      <Field
        id={`${id}-description`}
        label="Sinopse"
        error={errors.description}
      >
        <Textarea
          id={`${id}-description`}
          rows={4}
          maxLength={5000}
          value={values.description}
          onChange={set("description")}
        />
      </Field>
      <Field
        id={`${id}-reason`}
        label="Por que a mudança?"
        error={errors.reason}
      >
        <Textarea
          id={`${id}-reason`}
          rows={2}
          maxLength={1000}
          value={values.reason}
          placeholder="O título está com erro de digitação"
          onChange={set("reason")}
        />
      </Field>
      <ErrorLine error={error} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Enviando…" : "Enviar sugestão"}
        </Button>
      </DialogFooter>
    </form>
  );
}

async function searchCatalog(query: string, signal: AbortSignal) {
  const response = await fetch(
    `/api/books/search?q=${encodeURIComponent(query)}&scope=catalog`,
    { signal },
  );
  if (!response.ok) throw new Error(String(response.status));
  return ((await response.json()) as { results: SearchResult[] }).results;
}

function DeleteForm({
  book,
  onDone,
}: {
  book: BookDetails;
  onDone: () => void;
}) {
  const id = useId();
  const [kind, setKind] = useState<DeleteKind>("duplicado");
  const [search, setSearch] = useState("");
  const [duplicateOf, setDuplicateOf] = useState<SearchResult | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const query = useDebouncedValue(search.trim(), 250);
  const results = useQuery({
    queryKey: ["busca-livros", query, "catalog"],
    queryFn: ({ signal }) => searchCatalog(query, signal),
    enabled: kind === "duplicado" && query.length >= 2,
  });
  const options = (results.data ?? []).filter(
    (result) => result.catalogId && result.catalogId !== book.id,
  );

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await suggestBookDeletion({
        bookId: book.id,
        kind,
        duplicateOf:
          kind === "duplicado" ? (duplicateOf?.catalogId ?? null) : null,
        reason,
      });
      if (result.ok) {
        toast.success("Sugestão enviada", {
          description: "A equipe revisa e avisa você.",
        });
        onDone();
        return;
      }
      setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>Sugerir exclusão</DialogTitle>
        <DialogDescription>
          {book.title} sai do catálogo se a equipe concordar. Um duplicado é
          juntado ao livro certo, com as estantes de todo mundo.
        </DialogDescription>
      </DialogHeader>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">O motivo</legend>
        {DELETE_KINDS.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2.5 text-sm"
          >
            <input
              type="radio"
              name={`${id}-motivo`}
              value={option.value}
              checked={kind === option.value}
              onChange={() => setKind(option.value)}
              className="size-4 accent-foreground"
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      {kind === "duplicado" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-busca`}>De qual livro?</Label>
          {duplicateOf ? (
            <div className="flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="line-clamp-2 font-serif">
                  {duplicateOf.title}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {duplicateOf.authors.join(", ")}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setDuplicateOf(null)}
              >
                Trocar
              </Button>
            </div>
          ) : (
            <>
              <Input
                id={`${id}-busca`}
                type="search"
                value={search}
                placeholder="Busque o livro certo"
                onChange={(event) => setSearch(event.target.value)}
              />
              {options.length > 0 ? (
                <ul
                  aria-label="Livros do catálogo"
                  className="flex flex-col rounded-control border border-border"
                >
                  {options.slice(0, 6).map((option) => (
                    <li key={option.catalogId}>
                      <button
                        type="button"
                        onClick={() => setDuplicateOf(option)}
                        className={cn(
                          "flex w-full cursor-pointer flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted focus-visible:-outline-offset-2",
                        )}
                      >
                        <span className="line-clamp-2 font-serif">
                          {option.title}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {[option.authors.join(", "), option.publishedYear]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : query.length >= 2 && results.data ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum livro do MyBooks com esse nome.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-detalhes`}>Conte mais</Label>
        <Textarea
          id={`${id}-detalhes`}
          rows={2}
          maxLength={1000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      <ErrorLine error={error} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Enviando…" : "Enviar sugestão"}
        </Button>
      </DialogFooter>
    </form>
  );
}
