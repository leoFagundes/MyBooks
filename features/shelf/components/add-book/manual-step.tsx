"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { SwapText } from "@/components/motion/swap-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createManualBook } from "@/features/books/actions";
import { BookCover } from "@/features/books/components/book-cover";
import {
  type ManualBook,
  type ManualBookFields,
  manualBookSchema,
} from "@/features/books/schemas";
import type { BookVisual } from "@/features/books/types";
import type { ChosenBook } from "./chosen-book";

const squish = (text: string) => text.replace(/\s+/g, " ").trim();

type FieldName = keyof ManualBookFields;

/**
 * Cadastro à mão, com a capa tipográfica mudando enquanto a pessoa escreve. O
 * livro entra no catálogo e segue para o passo de status e nota.
 */
export function ManualStep({
  initialTitle,
  onBack,
  onCreated,
}: {
  initialTitle: string;
  onBack: () => void;
  onCreated: (book: ChosenBook) => void;
}) {
  const id = useId();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    getValues,
    setError,
    formState: { errors },
  } = useForm<ManualBookFields, unknown, ManualBook>({
    resolver: zodResolver(manualBookSchema),
    defaultValues: {
      title: initialTitle,
      subtitle: "",
      authors: "",
      publishedYear: "",
      pageCount: "",
      isbn: "",
    },
  });
  const title = useWatch({ control, name: "title" });
  const authors = useWatch({ control, name: "authors" });

  const preview: BookVisual = {
    id: "previa",
    title: squish(title ?? "") || "Sem título",
    authors: (authors ?? "").split(",").map(squish).filter(Boolean),
    coverUrl: null,
    coverColor: null,
    pageCount: null,
    publishedYear: null,
  };

  const submit = handleSubmit(() => {
    setServerError(null);
    startSaving(async () => {
      // O servidor confere de novo, a partir do que a pessoa digitou
      const result = await createManualBook(getValues());
      if (result.ok) {
        onCreated({ ref: { catalogId: result.data.id }, visual: result.data });
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
      className="flex flex-col gap-5 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-2xl leading-tight tracking-tight">
          Cadastrar manualmente
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          O livro entra no catálogo e qualquer pessoa pode pôr na estante
          também.
        </p>
      </div>

      {/* A capa fica ao lado do título e da autoria, que são o que ela mostra;
          no celular, o resto vem embaixo em largura cheia */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-4 sm:gap-x-6">
        <div className="row-span-2 sm:row-span-5">
          <BookCover book={preview} size="sm" tilt={false} />
        </div>
        {field("title", "Título", { autoFocus: true, autoComplete: "off" })}
        <div className="flex flex-col gap-1.5">
          {field("authors", "Autoria", { autoComplete: "off" })}
          <p className="text-xs text-muted-foreground">
            Mais de um nome? Separe com vírgula.
          </p>
        </div>
        <div className="col-span-2 flex flex-col gap-4 sm:col-span-1 sm:col-start-2 sm:row-span-3">
          {field("subtitle", "Subtítulo", { autoComplete: "off" })}
          <div className="grid grid-cols-2 gap-4">
            {field("publishedYear", "Ano", { inputMode: "numeric" })}
            {field("pageCount", "Páginas", { inputMode: "numeric" })}
          </div>
          {field("isbn", "ISBN", { inputMode: "numeric", autoComplete: "off" })}
        </div>
      </div>

      {serverError ? (
        <p role="alert" className="text-xs text-destructive">
          {serverError}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          Voltar
        </Button>
        <Button type="submit" disabled={saving}>
          <SwapText text={saving ? "Cadastrando…" : "Continuar"} />
        </Button>
      </div>
    </form>
  );
}
