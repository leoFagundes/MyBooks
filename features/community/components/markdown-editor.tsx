"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bold,
  BookOpen,
  EyeOff,
  Italic,
  Link2,
  List,
  Quote,
} from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { fieldClasses } from "@/components/ui/input";
import { resultVisual } from "@/features/shelf/components/add-book/chosen-book";
import type { SearchResult } from "@/features/books/lib/search-result";
import type { BookVisual } from "@/features/books/types";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { RichText } from "./rich-text";

type Wrap = {
  before: string;
  after: string;
  placeholder: string;
  block?: boolean;
};

const TOOLS: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  wrap: Wrap;
}[] = [
  {
    label: "Negrito",
    icon: Bold,
    wrap: { before: "**", after: "**", placeholder: "texto" },
  },
  {
    label: "Itálico",
    icon: Italic,
    wrap: { before: "*", after: "*", placeholder: "texto" },
  },
  {
    label: "Link",
    icon: Link2,
    wrap: { before: "[", after: "](https://)", placeholder: "texto do link" },
  },
  {
    label: "Citação",
    icon: Quote,
    wrap: { before: "> ", after: "", placeholder: "citação", block: true },
  },
  {
    label: "Lista",
    icon: List,
    wrap: { before: "- ", after: "", placeholder: "item", block: true },
  },
  {
    label: "Spoiler",
    icon: EyeOff,
    wrap: { before: "||", after: "||", placeholder: "spoiler" },
  },
];

async function searchCatalog(query: string, signal: AbortSignal) {
  const response = await fetch(
    `/api/books/search?q=${encodeURIComponent(query)}&scope=catalog`,
    { signal },
  );
  if (!response.ok) throw new Error(String(response.status));
  return ((await response.json()) as { results: SearchResult[] }).results;
}

/** Buscar um livro do MyBooks e citá-lo no texto (vira um card). */
function BookPicker({ onPick }: { onPick: (book: BookVisual) => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const query = useDebouncedValue(search.trim(), 250);
  const results = useQuery({
    queryKey: ["busca-livros", query, "catalog"],
    queryFn: ({ signal }) => searchCatalog(query, signal),
    enabled: open && query.length >= 2,
  });
  const options = (results.data ?? []).filter((result) => result.catalogId);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="gap-1.5">
          <BookOpen className="size-4" strokeWidth={1.5} aria-hidden />
          Livro
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <label htmlFor={`${id}-livro`} className="sr-only">
          Buscar um livro
        </label>
        <Input
          id={`${id}-livro`}
          type="search"
          placeholder="Buscar um livro"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <ul className="mt-2 flex max-h-64 flex-col overflow-y-auto">
          {options.slice(0, 8).map((option) => (
            <li key={option.catalogId}>
              <button
                type="button"
                onClick={() => {
                  onPick(resultVisual(option));
                  setOpen(false);
                  setSearch("");
                }}
                className="flex w-full cursor-pointer flex-col items-start rounded-control px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:-outline-offset-2"
              >
                <span className="line-clamp-2 font-serif">{option.title}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {option.authors.join(", ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/**
 * O editor da comunidade: o texto em Markdown leve com uma barra que põe as
 * marcas (negrito, itálico, link, citação, lista, spoiler e livro) e a
 * prévia de como vai ficar.
 */
export function MarkdownEditor({
  id,
  value,
  onChange,
  books,
  onBook,
  rows = 8,
  maxLength,
  placeholder,
  invalid,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Os livros já citados, para a prévia. */
  books: Record<string, BookVisual>;
  onBook: (book: BookVisual) => void;
  rows?: number;
  maxLength: number;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  function insert(wrap: Wrap) {
    const node = area.current;
    const start = node?.selectionStart ?? value.length;
    const end = node?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || wrap.placeholder;
    // Marca de bloco começa a linha
    const needsBreak = wrap.block && start > 0 && value[start - 1] !== "\n";
    const before = `${needsBreak ? "\n" : ""}${wrap.before}`;
    const next = `${value.slice(0, start)}${before}${selected}${wrap.after}${value.slice(end)}`;
    onChange(next.slice(0, maxLength));
    requestAnimationFrame(() => {
      node?.focus();
      const from = start + before.length;
      node?.setSelectionRange(from, from + selected.length);
    });
  }

  // O livro num parágrafo só dele (linhas em branco em volta) vira o card
  function pickBook(book: BookVisual) {
    onBook(book);
    insert({
      before: `\n\n[[livro:${book.id}]]\n\n`,
      after: "",
      placeholder: "",
      block: false,
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="toolbar"
          aria-label="Formatação"
          className="flex flex-wrap items-center gap-0.5"
        >
          {TOOLS.map((tool) => (
            <Button
              key={tool.label}
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={tool.label}
              title={tool.label}
              disabled={preview}
              onClick={() => insert(tool.wrap)}
            >
              <tool.icon className="size-4" />
            </Button>
          ))}
          {preview ? null : <BookPicker onPick={pickBook} />}
        </div>
        <div className="flex gap-1 text-sm">
          <button
            type="button"
            aria-pressed={!preview}
            onClick={() => setPreview(false)}
            className={cn(
              "cursor-pointer rounded-control px-2.5 py-1",
              !preview ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
          >
            Escrever
          </button>
          <button
            type="button"
            aria-pressed={preview}
            onClick={() => setPreview(true)}
            className={cn(
              "cursor-pointer rounded-control px-2.5 py-1",
              preview ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
          >
            Prévia
          </button>
        </div>
      </div>
      {preview ? (
        <div className={cn(fieldClasses, "min-h-40 py-3")}>
          {value.trim() ? (
            <RichText source={value} books={books} />
          ) : (
            <p className="text-muted-foreground">Nada para mostrar ainda.</p>
          )}
        </div>
      ) : (
        <Textarea
          ref={area}
          id={id}
          rows={rows}
          maxLength={maxLength}
          value={value}
          placeholder={placeholder}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          className="leading-relaxed"
        />
      )}
      <p className="font-mono text-[11px] text-muted-foreground">
        **negrito** · *itálico* · [link](https://…) · &gt; citação · - lista ·
        ||spoiler|| · @usuário
      </p>
    </div>
  );
}
