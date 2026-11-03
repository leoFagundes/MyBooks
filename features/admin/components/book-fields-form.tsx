"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ManualBookFields } from "@/features/books/schemas";
import type { ActionResult } from "@/lib/action";

export type BookFieldsInitial = {
  title: string;
  subtitle: string | null;
  authors: string[];
  publishedYear: number | null;
  pageCount: number | null;
  isbn13: string | null;
  description: string | null;
};

/**
 * Os dados de um livro numa janela do painel: o "editar e aprovar" da
 * moderação e o "editar" da tela Livros. O servidor valida de novo.
 */
export function BookFieldsForm({
  title,
  description,
  confirm,
  initial,
  onSubmit,
  success,
  onDone,
}: {
  title: string;
  description: string;
  confirm: string;
  initial: BookFieldsInitial;
  onSubmit: (
    fields: ManualBookFields,
    description: string,
  ) => Promise<ActionResult>;
  success: string;
  onDone: () => void;
}) {
  const id = useId();
  const [values, setValues] = useState({
    title: initial.title,
    subtitle: initial.subtitle ?? "",
    authors: initial.authors.join(", "),
    publishedYear: initial.publishedYear ? String(initial.publishedYear) : "",
    pageCount: initial.pageCount ? String(initial.pageCount) : "",
    isbn: initial.isbn13 ?? "",
    description: initial.description ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const field = (key: keyof typeof values, label: string, mono = false) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`${id}-${key}`}>{label}</Label>
      <Input
        id={`${id}-${key}`}
        value={values[key]}
        className={mono ? "font-mono" : undefined}
        onChange={(event) =>
          setValues((current) => ({ ...current, [key]: event.target.value }))
        }
      />
    </div>
  );

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const { description: synopsis, ...fields } = values;
        startTransition(async () => {
          const result = await onSubmit(fields, synopsis);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          toast.success(success);
          onDone();
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {field("title", "Título")}
      {field("subtitle", "Subtítulo")}
      {field("authors", "Autoria (separe com vírgula)")}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {field("publishedYear", "Ano", true)}
        {field("pageCount", "Páginas", true)}
        {field("isbn", "ISBN", true)}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-description`}>Sinopse</Label>
        <Textarea
          id={`${id}-description`}
          rows={4}
          maxLength={5000}
          value={values.description}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
        />
      </div>
      <div aria-live="polite">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Salvando…" : confirm}
        </Button>
      </DialogFooter>
    </form>
  );
}
