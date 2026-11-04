"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Bold,
  BookOpen,
  EyeOff,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  Quote,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { commandItemClasses } from "@/components/ui/command-styles";
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
import { initials } from "@/lib/initials";
import { springs, tweens } from "@/lib/motion";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { mentionsIn } from "../lib/markdown";
import { RichText } from "./rich-text";

type Wrap = {
  before: string;
  after: string;
  placeholder: string;
  block?: boolean;
};

type Tool = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  wrap: Wrap;
};

const HEADING_TOOLS: Tool[] = [
  {
    label: "Título 1",
    icon: Heading1,
    wrap: { before: "# ", after: "", placeholder: "Título", block: true },
  },
  {
    label: "Título 2",
    icon: Heading2,
    wrap: { before: "## ", after: "", placeholder: "Título", block: true },
  },
];

const TOOLS: Tool[] = [
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

type Mentionable = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

async function searchMentions(query: string, signal: AbortSignal) {
  const response = await fetch(
    `/api/readers/mentions?q=${encodeURIComponent(query)}`,
    { signal },
  );
  if (!response.ok) throw new Error(String(response.status));
  return ((await response.json()) as { readers: Mentionable[] }).readers;
}

// O @ que está sendo digitado, colado no cursor (o de um e-mail não conta)
const MENTION_AT_CARET = /(?:^|[^\w@])@([a-zA-Z0-9_]{0,20})$/;

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
  headings = false,
  mentions = false,
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
  /** Os botões de título (só no tópico). */
  headings?: boolean;
  /** A lista de @ enquanto se digita (no fórum, onde a menção avisa). */
  mentions?: boolean;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const listId = useId();
  const [mention, setMention] = useState<{
    start: number;
    end: number;
    query: string;
  } | null>(null);
  const [active, setActive] = useState(0);
  const mentionQuery = useDebouncedValue(mention?.query ?? "", 150);
  const found = useQuery({
    queryKey: ["mencoes", mentionQuery],
    queryFn: ({ signal }) => searchMentions(mentionQuery, signal),
    enabled: mentions && mentionQuery.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const options =
    mention && mention.query.length >= 2 ? (found.data ?? []) : [];
  const listOpen = mention !== null;
  const mentioned = mentions ? mentionsIn(value) : [];

  // O Esc fecha a lista, não a gaveta: a janela ouve antes do Radix
  useEffect(() => {
    if (!listOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      event.preventDefault();
      setMention(null);
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [listOpen]);

  /** Abre, atualiza ou fecha a lista conforme o cursor está num @. */
  function track(node: HTMLTextAreaElement) {
    if (!mentions) return;
    const caret = node.selectionStart;
    const match =
      caret === node.selectionEnd
        ? MENTION_AT_CARET.exec(node.value.slice(0, caret))
        : null;
    if (!match) {
      setMention(null);
      return;
    }
    const query = match[1] ?? "";
    if (query !== mention?.query) setActive(0);
    setMention({ start: caret - query.length - 1, end: caret, query });
  }

  function pickMention(reader: Mentionable) {
    if (!mention) return;
    const text = `@${reader.username} `;
    setMention(null);
    commit(
      `${value.slice(0, mention.start)}${text}${value.slice(mention.end)}`,
      mention.start + text.length,
      mention.start + text.length,
    );
  }

  function onMentionKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mention || options.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index + step + options.length) % options.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const reader = options[active];
      if (reader) pickMention(reader);
    }
  }

  function commit(next: string, from: number, to: number) {
    const node = area.current;
    onChange(next.slice(0, maxLength));
    requestAnimationFrame(() => {
      node?.focus();
      node?.setSelectionRange(from, to);
    });
  }

  /**
   * Título, citação e lista valem para a linha inteira (as que a seleção
   * toca), não para o ponto do cursor: o negrito do meio da linha continua
   * inteiro. Clicar de novo tira a marca; outro título troca o nível.
   */
  function applyBlock(wrap: Wrap, start: number, end: number) {
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lastChar = end > start && value[end - 1] === "\n" ? end - 1 : end;
    const breakAt = value.indexOf("\n", lastChar);
    const lineEnd = breakAt === -1 ? value.length : breakAt;
    const marker = wrap.before;
    const family = marker.startsWith("#")
      ? /^#{1,2} /
      : marker === "> "
        ? /^> /
        : /^[-*] /;
    const lines = value.slice(lineStart, lineEnd).split("\n");
    const marked = lines.every((line) => line.startsWith(marker));
    const changed = lines
      .map((line) => {
        const bare = line.replace(family, "");
        return marked ? bare : `${marker}${bare || wrap.placeholder}`;
      })
      .join("\n");
    commit(
      `${value.slice(0, lineStart)}${changed}${value.slice(lineEnd)}`,
      lineStart,
      lineStart + changed.length,
    );
  }

  /** Quantas vezes `char` se repete logo antes de `at` (ou logo depois). */
  function run(char: string, at: number, step: -1 | 1) {
    let count = 0;
    let index = step < 0 ? at - 1 : at;
    while (value[index] === char) {
      count += 1;
      index += step;
    }
    return count;
  }

  function insert(wrap: Wrap) {
    const node = area.current;
    const start = node?.selectionStart ?? value.length;
    const end = node?.selectionEnd ?? value.length;
    if (wrap.block) {
      applyBlock(wrap, start, end);
      return;
    }
    // Negrito, itálico e spoiler já em volta da seleção: clicar de novo tira.
    // Os efeitos se somam (o itálico dentro do negrito vira ***)
    const char = wrap.before[0] ?? "";
    const repeated =
      start < end &&
      wrap.before === wrap.after &&
      wrap.before === char.repeat(wrap.before.length);
    if (repeated) {
      const around = Math.min(run(char, start, -1), run(char, end, 1));
      const size = wrap.before.length;
      const present =
        char === "*" && size === 1 ? around % 2 === 1 : around >= size;
      if (present) {
        commit(
          `${value.slice(0, start - size)}${value.slice(start, end)}${value.slice(end + size)}`,
          start - size,
          end - size,
        );
        return;
      }
    }
    const selected = value.slice(start, end) || wrap.placeholder;
    const next = `${value.slice(0, start)}${wrap.before}${selected}${wrap.after}${value.slice(end)}`;
    const from = start + wrap.before.length;
    commit(next, from, from + selected.length);
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
          {(headings ? [...HEADING_TOOLS, ...TOOLS] : TOOLS).map((tool) => (
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
        <div className="relative">
          <Textarea
            ref={area}
            id={id}
            rows={rows}
            maxLength={maxLength}
            value={value}
            placeholder={placeholder}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={describedBy}
            aria-autocomplete={mentions ? "list" : undefined}
            aria-controls={options.length > 0 ? listId : undefined}
            aria-activedescendant={
              options[active] ? `${listId}-${active}` : undefined
            }
            onChange={(event) => {
              onChange(event.target.value);
              track(event.target);
            }}
            onSelect={(event) => track(event.currentTarget)}
            onKeyDown={onMentionKey}
            onBlur={() => setMention(null)}
            className="leading-relaxed"
          />
          <AnimatePresence>
            {mention ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, transition: tweens.fast }}
                transition={springs.snappy}
                className="absolute top-full left-0 z-20 mt-1 w-72 max-w-full rounded-card border border-border bg-surface p-1 shadow-sm"
              >
                {options.length > 0 ? (
                  <ul
                    id={listId}
                    role="listbox"
                    aria-label="Leitores para mencionar"
                  >
                    {options.map((reader, index) => (
                      <li
                        key={reader.username}
                        id={`${listId}-${index}`}
                        role="option"
                        aria-selected={index === active}
                        data-selected={index === active}
                        // O clique não tira o foco do texto
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => pickMention(reader)}
                        className={commandItemClasses}
                      >
                        <Avatar className="size-6">
                          {reader.avatarUrl ? (
                            <AvatarImage src={reader.avatarUrl} alt="" />
                          ) : null}
                          <AvatarFallback className="text-[10px]">
                            {initials(reader.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate">
                          {reader.displayName}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          @{reader.username}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    {mention.query.length < 2
                      ? "Continue digitando o @ de alguém"
                      : found.isFetching
                        ? "Procurando…"
                        : "Ninguém com esse @"}
                  </p>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}
      {mentioned.length > 0 ? (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          Vai avisar
          {mentioned.map((username) => (
            <span
              key={username}
              className="rounded-full border border-border px-2 py-0.5 font-mono text-foreground"
            >
              @{username}
            </span>
          ))}
        </p>
      ) : null}
      <p className="font-mono text-[11px] text-muted-foreground">
        {headings ? "# título · ## subtítulo · " : null}**negrito** · *itálico*
        · [link](https://…) · &gt; citação · - lista · ||spoiler|| · @usuário
      </p>
    </div>
  );
}
