"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
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
import { MarkdownEditor } from "@/features/community/components/markdown-editor";
import type { BookVisual } from "@/features/books/types";
import { formatNumber } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useMediaQuery } from "@/lib/use-media-query";
import { createSuggestion } from "../actions";
import {
  type SimilarSuggestion,
  SUGGESTION_CATEGORIES,
  type SuggestionCategory,
  statusLabel,
} from "../types";

async function fetchSimilar(q: string, signal: AbortSignal) {
  const response = await fetch(
    `/api/suggestions/similar?q=${encodeURIComponent(q)}`,
    {
      signal,
    },
  );
  if (!response.ok) throw new Error(String(response.status));
  return ((await response.json()) as { similar: SimilarSuggestion[] }).similar;
}

/**
 * Enviar uma sugestão (MELHORIAS 8.2), na gaveta. Enquanto a pessoa digita o
 * título, aparecem as parecidas (pg_trgm): votar numa delas vale mais do que
 * abrir uma repetida.
 */
export function SuggestionEditor({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
          <SheetTitle>Enviar sugestão</SheetTitle>
        </SheetHeader>
        {open ? <SuggestionForm onDone={() => onOpenChange(false)} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function SuggestionForm({ onDone }: { onDone: () => void }) {
  const id = useId();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] =
    useState<SuggestionCategory>("funcionalidade");
  const [books, setBooks] = useState<Record<string, BookVisual>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const query = useDebouncedValue(title.trim(), 300);
  const similar = useQuery({
    queryKey: ["sugestoes-parecidas", query],
    queryFn: ({ signal }) => fetchSimilar(query, signal),
    enabled: query.length >= 4,
    staleTime: 30_000,
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSuggestion({ title, body, category });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setError(result.error);
        return;
      }
      toast.success("Sugestão enviada", {
        description: "Obrigado pela ideia!",
      });
      onDone();
      router.push(routes.suggestion(result.data.id));
    });
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-4"
    >
      <div className="-mx-6 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-6 py-1">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-titulo`}>Título</Label>
          <Input
            id={`${id}-titulo`}
            value={title}
            maxLength={120}
            placeholder="Ex.: modo escuro na leitura de citações"
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? `${id}-titulo-erro` : undefined}
            onChange={(event) => setTitle(event.target.value)}
          />
          {errors.title ? (
            <p id={`${id}-titulo-erro`} className="text-xs text-destructive">
              {errors.title}
            </p>
          ) : null}
        </div>
        {similar.data && similar.data.length > 0 ? (
          <section
            aria-labelledby={`${id}-parecidas`}
            className="flex flex-col gap-2 rounded-card border border-border p-4"
          >
            <h3 id={`${id}-parecidas`} className="text-sm font-medium">
              Já sugeriram algo parecido?
            </h3>
            <p className="text-xs text-muted-foreground">
              Votar numa sugestão que já existe ajuda mais do que repetir.
            </p>
            <ul className="flex flex-col gap-1">
              {similar.data.map((item) => (
                <li key={item.id}>
                  <Link
                    href={routes.suggestion(item.id)}
                    onClick={onDone}
                    className="flex items-center justify-between gap-3 rounded-control px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <span className="line-clamp-2">{item.title}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {statusLabel(item.status)} · {formatNumber(item.votes)}{" "}
                      {item.votes === 1 ? "voto" : "votos"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-categoria`}>Categoria</Label>
          <select
            id={`${id}-categoria`}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as SuggestionCategory)
            }
            className={`${fieldClasses} h-10`}
          >
            {SUGGESTION_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-descricao`}>Descrição</Label>
          <MarkdownEditor
            id={`${id}-descricao`}
            value={body}
            onChange={setBody}
            books={books}
            onBook={(book) =>
              setBooks((current) => ({ ...current, [book.id]: book }))
            }
            maxLength={5000}
            rows={6}
            placeholder="O que você gostaria, e por quê?"
            invalid={Boolean(errors.body)}
          />
          {errors.body ? (
            <p className="text-xs text-destructive">{errors.body}</p>
          ) : null}
        </div>
        <div aria-live="polite">
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>
      <SheetFooter className="flex-row justify-end">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Enviando…" : "Enviar"}
        </Button>
      </SheetFooter>
    </form>
  );
}
