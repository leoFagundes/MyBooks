"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { BookCover } from "@/features/books/components/book-cover";
import { StarRating } from "@/features/books/components/star-rating";
import {
  type ShelfDetails,
  type ShelfStatus,
  shelfDetailsSchema,
} from "../../schemas";
import {
  EDITABLE_COLLECTIONS_KEY,
  fetchEditableCollections,
} from "@/features/collections/lib/editable-collections";
import { byline, type ChosenBook } from "./chosen-book";

const STATUS_OPTIONS = [
  { value: "want", label: "Quero ler" },
  { value: "reading", label: "Lendo" },
  { value: "read", label: "Lido" },
  { value: "abandoned", label: "Abandonado" },
] as const satisfies readonly { value: ShelfStatus; label: string }[];

const DATE_LABEL: Record<Exclude<ShelfStatus, "want">, string> = {
  reading: "Comecei em",
  read: "Terminei em",
  abandoned: "Parei em",
};

// O dia de hoje no fuso de quem usa, no formato do <input type="date">
const today = () => new Date().toLocaleDateString("sv-SE");

/**
 * Enter salva de qualquer lugar do passo, inclusive do status (o radiogroup
 * do Radix segura o Enter) e das estrelas. Botões comuns fazem o clique deles.
 */
function submitOnEnter(event: React.KeyboardEvent<HTMLFormElement>) {
  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
  const target = event.target as HTMLElement;
  if (target.tagName === "BUTTON" && target.getAttribute("role") !== "radio")
    return;
  event.preventDefault();
  event.currentTarget.requestSubmit();
}

/** O passo compacto: status, nota, data e, se houver, a coleção. Enter salva. */
export function DetailsStep({
  book,
  onBack,
  onSave,
}: {
  book: ChosenBook;
  onBack: () => void;
  onSave: (details: ShelfDetails, collectionId: string | null) => void;
}) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const saved = useRef(false);
  const [status, setStatus] = useState<ShelfStatus>("want");
  const [rating, setRating] = useState<number | null>(null);
  const [day, setDay] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { data: collections = [] } = useQuery({
    queryKey: EDITABLE_COLLECTIONS_KEY,
    queryFn: fetchEditableCollections,
    // Uma coleção criada agora há pouco já aparece
    staleTime: 0,
  });

  // Entra com o foco no status: as setas trocam e o Enter já salva
  useEffect(() => {
    form.current
      ?.querySelector<HTMLElement>('[role="radio"][data-state="checked"]')
      ?.focus();
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Enter duas vezes salva uma só
    if (saved.current) return;
    const parsed = shelfDetailsSchema.safeParse({
      status,
      rating: status === "want" ? null : rating,
      startedAt: status === "reading" && day ? day : null,
      finishedAt:
        (status === "read" || status === "abandoned") && day ? day : null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira a nota e a data.");
      return;
    }
    saved.current = true;
    onSave(parsed.data, collectionId || null);
  }

  return (
    <form
      ref={form}
      onSubmit={submit}
      onKeyDown={submitOnEnter}
      noValidate
      className="flex flex-col gap-6 p-5 sm:p-6"
    >
      <div className="flex items-start gap-4">
        <BookCover book={book.visual} size="sm" tilt={false} />
        <div className="flex min-w-0 flex-col gap-1.5 pt-1">
          <h2 className="font-serif text-2xl leading-tight tracking-tight text-balance">
            {book.visual.title}
          </h2>
          <p className="font-mono text-xs text-muted-foreground">
            {byline(book.visual)}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span aria-hidden className="text-sm font-medium">
          Status
        </span>
        <SegmentedControl
          aria-label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onValueChange={(next) => {
            setStatus(next);
            setError(null);
          }}
        />
      </div>

      {status !== "want" ? (
        <div className="grid animate-[aparecer_var(--duration-base)_var(--ease-standard)_both] gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span aria-hidden className="text-sm font-medium">
              Nota
            </span>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-data`}>{DATE_LABEL[status]}</Label>
            <Input
              id={`${id}-data`}
              type="date"
              max={today()}
              value={day}
              onChange={(event) => {
                setDay(event.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-erro` : undefined}
            />
          </div>
        </div>
      ) : null}

      {collections.length > 0 ? (
        <div className="flex animate-[aparecer_var(--duration-base)_var(--ease-standard)_both] flex-col gap-2">
          <Label htmlFor={`${id}-colecao`}>
            Coleção{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </Label>
          <select
            id={`${id}-colecao`}
            value={collectionId}
            onChange={(event) => setCollectionId(event.target.value)}
            className="h-10 w-full cursor-pointer rounded-control border border-border-strong bg-background px-3 text-sm"
          >
            <option value="">Nenhuma</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.emoji
                  ? `${collection.emoji} ${collection.title}`
                  : collection.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error ? (
        <p id={`${id}-erro`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          Voltar
        </Button>
        <Button type="submit">Salvar na estante</Button>
      </div>
    </form>
  );
}
