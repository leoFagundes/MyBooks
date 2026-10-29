"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { SwapText } from "@/components/motion/swap-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createManualBook, updateManualBook } from "../actions";
import type { BookDetails } from "../queries";
import {
  type ManualBook,
  type ManualBookFields,
  manualBookSchema,
} from "../schemas";
import type { BookVisual } from "../types";
import {
  type CoverDraft,
  CoverControls,
  CoverPreview,
  previewBook,
} from "./cover-designer";

const squish = (text: string) => text.replace(/\s+/g, " ").trim();

type FieldName = keyof ManualBookFields;

/** Cadastrar um livro novo, ou editar um que a pessoa cadastrou à mão. */
export type ManualBookMode =
  | { kind: "create"; initialTitle: string }
  | { kind: "edit"; book: BookDetails };

function initialFields(mode: ManualBookMode): ManualBookFields {
  if (mode.kind === "create") {
    return {
      title: mode.initialTitle,
      subtitle: "",
      authors: "",
      publishedYear: "",
      pageCount: "",
      isbn: "",
    };
  }
  const { book } = mode;
  return {
    title: book.title,
    subtitle: book.subtitle ?? "",
    authors: book.authors.join(", "),
    publishedYear: book.publishedYear?.toString() ?? "",
    pageCount: book.pageCount?.toString() ?? "",
    isbn: book.isbn13 ?? book.isbn10 ?? "",
  };
}

function initialDraft(mode: ManualBookMode): CoverDraft {
  if (mode.kind === "create") {
    return { color: null, style: "classic", image: { kind: "none" } };
  }
  const { book } = mode;
  return {
    color: book.coverColor,
    style: book.coverStyle,
    image: book.coverUrl
      ? { kind: "current", url: book.coverUrl }
      : { kind: "none" },
  };
}

const numberOrNull = (text: string | undefined) =>
  text && /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;

/**
 * O formulário do livro feito à mão: os dados, com a capa mudando enquanto a
 * pessoa escreve, e o desenho da capa (imagem, estilo e cor) com a prévia em
 * capa, lombada e 3D. Serve ao cadastro (na paleta de adicionar livro) e à
 * edição (na página do livro, para quem o cadastrou).
 */
export function ManualBookForm({
  mode,
  onCancel,
  onSaved,
}: {
  mode: ManualBookMode;
  onCancel: () => void;
  onSaved: (book: BookVisual) => void;
}) {
  const id = useId();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [draft, setDraft] = useState(() => initialDraft(mode));
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    formState: { errors },
  } = useForm<ManualBookFields, unknown, ManualBook>({
    resolver: zodResolver(manualBookSchema),
    defaultValues: initialFields(mode),
  });
  const title = useWatch({ control, name: "title" });
  const authors = useWatch({ control, name: "authors" });
  const pageCount = useWatch({ control, name: "pageCount" });
  const year = useWatch({ control, name: "publishedYear" });

  const preview = previewBook(
    {
      title: squish(title ?? "") || "Sem título",
      authors: (authors ?? "").split(",").map(squish).filter(Boolean),
      pageCount: numberOrNull(pageCount),
      publishedYear: numberOrNull(year),
    },
    draft,
  );
  const editing = mode.kind === "edit";

  const submit = handleSubmit(() => {
    setServerError(null);
    startSaving(async () => {
      // O servidor confere de novo, a partir do que a pessoa digitou
      const design = { color: draft.color, style: draft.style };
      const image = draft.image.kind === "new" ? draft.image.file : null;
      const result =
        mode.kind === "create"
          ? await createManualBook(getValues(), design, image)
          : await updateManualBook(
              mode.book.id,
              getValues(),
              design,
              image,
              draft.image.kind === "none" && mode.book.coverUrl !== null,
            );
      if (result.ok) {
        onSaved(result.data);
        return;
      }
      const fields = Object.entries(result.fieldErrors ?? {});
      for (const [field, message] of fields) {
        setError(field as FieldName, { message });
      }
      if (fields.length === 0) setServerError(result.error);
    });
  });

  function field(
    name: FieldName,
    label: string,
    props: React.ComponentProps<"input"> = {},
  ) {
    const error = errors[name]?.message;
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-${name}`}>{label}</Label>
        <Input
          id={`${id}-${name}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-${name}-erro` : undefined}
          {...props}
          {...register(name)}
        />
        {error ? (
          <p id={`${id}-${name}-erro`} className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-6 p-5 sm:p-6"
    >
      {editing ? null : (
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-2xl leading-tight tracking-tight">
            Cadastrar manualmente
          </h2>
          <p className="text-sm text-pretty text-muted-foreground">
            O livro entra no catálogo e qualquer pessoa pode pôr na estante
            também.
          </p>
        </div>
      )}

      {/* No celular, a prévia vem em cima e os campos embaixo, em largura cheia */}
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-[auto_minmax(0,1fr)]">
        <CoverPreview book={preview} />
        <div className="flex min-w-0 flex-col gap-4">
          {field("title", "Título", {
            autoFocus: !editing,
            autoComplete: "off",
          })}
          <div className="flex flex-col gap-1.5">
            {field("authors", "Autoria", { autoComplete: "off" })}
            <p className="text-xs text-muted-foreground">
              Mais de um nome? Separe com vírgula.
            </p>
          </div>
          {field("subtitle", "Subtítulo", { autoComplete: "off" })}
          <div className="grid grid-cols-2 gap-4">
            {field("publishedYear", "Ano", { inputMode: "numeric" })}
            {field("pageCount", "Páginas", { inputMode: "numeric" })}
          </div>
          {field("isbn", "ISBN", { inputMode: "numeric", autoComplete: "off" })}
        </div>
      </div>

      <CoverControls book={preview} draft={draft} onChange={setDraft} />

      <div aria-live="polite">
        {serverError ? (
          <p className="text-xs text-destructive">{serverError}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {editing ? "Cancelar" : "Voltar"}
        </Button>
        <Button type="submit" disabled={saving}>
          <SwapText
            text={
              saving
                ? editing
                  ? "Salvando…"
                  : "Cadastrando…"
                : editing
                  ? "Salvar"
                  : "Continuar"
            }
          />
        </Button>
      </div>
    </form>
  );
}
