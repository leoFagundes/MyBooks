"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Command } from "cmdk";
import { Plus, X } from "lucide-react";
import { motion } from "motion/react";
import { useId, useState, useTransition } from "react";
import { commandItemClasses } from "@/components/ui/command-styles";
import { fieldClasses } from "@/components/ui/input";
import { pressScale, springs } from "@/lib/motion";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { createGenre } from "../actions";
import { GENRES, genreLabel } from "../genres";
import { type Genre, normalizeGenreName } from "../lib/genre-name";

export const MAX_GENRES = 10;

const chip =
  "flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const on = "border-foreground bg-foreground text-background";
const off = "border-border bg-surface text-foreground hover:bg-muted";

type Lookup = { matches: Genre[]; same: Genre | null; similar: Genre | null };

async function lookup(query: string, signal: AbortSignal): Promise<Lookup> {
  const response = await fetch(`/api/genres?q=${encodeURIComponent(query)}`, {
    signal,
  });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as Lookup;
}

/**
 * Os gêneros favoritos, até 10 (MELHORIAS 5.4): os oficiais do MyBooks como
 * botões de liga e desliga, os que a pessoa escolheu entre os criados por
 * leitores e, embaixo, a busca de outro gênero, que oferece "Criar". Um
 * gênero criado agora fica "em análise": só quem criou o vê até a aprovação.
 */
export function GenreChips({
  value,
  onChange,
  known = [],
}: {
  value: string[];
  onChange: (genres: string[]) => void;
  /** O nome dos favoritos que não são oficiais (os que já estão salvos). */
  known?: Genre[];
}) {
  const [names, setNames] = useState<Record<string, Genre>>(() =>
    Object.fromEntries(known.map((genre) => [genre.slug, genre])),
  );
  const full = value.length >= MAX_GENRES;
  const custom = value.filter((slug) => !genreLabel(slug));

  function toggle(slug: string) {
    onChange(
      value.includes(slug)
        ? value.filter((genre) => genre !== slug)
        : full
          ? value
          : [...value, slug],
    );
  }

  function add(genre: Genre) {
    setNames((current) => ({ ...current, [genre.slug]: genre }));
    if (!value.includes(genre.slug) && !full) onChange([...value, genre.slug]);
  }

  return (
    <div className="flex flex-col gap-3">
      <ul aria-label="Gêneros" className="flex flex-wrap gap-2">
        {GENRES.map((genre) => {
          const selected = value.includes(genre.slug);
          return (
            <li key={genre.slug}>
              <motion.button
                type="button"
                aria-pressed={selected}
                disabled={!selected && full}
                onClick={() => toggle(genre.slug)}
                whileTap={{ scale: pressScale }}
                transition={springs.snappy}
                className={cn(chip, selected ? on : off)}
              >
                {genre.label}
              </motion.button>
            </li>
          );
        })}
        {custom.map((slug) => {
          const genre = names[slug];
          const name = genre?.name ?? slug;
          return (
            <li key={slug}>
              <motion.button
                type="button"
                aria-pressed
                aria-label={`Tirar ${name}`}
                onClick={() => toggle(slug)}
                whileTap={{ scale: pressScale }}
                transition={springs.snappy}
                className={cn(chip, on)}
              >
                {name}
                {genre?.pending ? (
                  <span className="font-mono text-[11px] opacity-70">
                    em análise
                  </span>
                ) : null}
                <X className="size-3.5" strokeWidth={1.5} aria-hidden />
              </motion.button>
            </li>
          );
        })}
      </ul>
      <GenreSearch selected={value} disabled={full} onPick={add} />
      <p className="font-mono text-xs text-muted-foreground">
        {value.length} de {MAX_GENRES}
        {full ? " · chegou ao limite" : ""}
      </p>
    </div>
  );
}

/** A busca de outro gênero: os que já existem e, se não houver igual, "Criar". */
function GenreSearch({
  selected,
  disabled,
  onPick,
}: {
  selected: string[];
  disabled: boolean;
  onPick: (genre: Genre) => void;
}) {
  const id = useId();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, startCreating] = useTransition();
  const query = useDebouncedValue(text.trim(), 200);
  const result = useQuery({
    queryKey: ["generos", query],
    queryFn: ({ signal }) => lookup(query, signal),
    enabled: query.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const typed = normalizeGenreName(text);
  const open = text.trim().length >= 2 && result.data !== undefined;
  const data = result.data;
  const matches = (data?.matches ?? []).filter(
    (genre) => !selected.includes(genre.slug),
  );
  const similar =
    data?.similar && !selected.includes(data.similar.slug)
      ? data.similar
      : null;
  const canCreate = !data?.same && typed.length >= 2;

  function pick(genre: Genre) {
    onPick(genre);
    setText("");
    setError(null);
  }

  function create() {
    setError(null);
    startCreating(async () => {
      const created = await createGenre(typed);
      if (!created.ok) {
        setError(created.error);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["generos"] });
      pick(created.data);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${id}-busca`} className="sr-only">
        Outro gênero
      </label>
      <Command shouldFilter={false} loop label="Outro gênero">
        <Command.Input
          id={`${id}-busca`}
          value={text}
          onValueChange={(next) => {
            setText(next);
            setError(null);
          }}
          disabled={disabled || creating}
          placeholder={disabled ? "Chegou ao limite" : "Outro gênero"}
          maxLength={40}
          aria-describedby={error ? `${id}-erro` : undefined}
          className={cn(fieldClasses, "h-10")}
        />
        {open ? (
          <Command.List className="mt-2 max-h-64 overflow-y-auto overscroll-contain rounded-card border border-border bg-surface p-1">
            {matches.map((genre) => (
              <Command.Item
                key={genre.slug}
                value={genre.slug}
                onSelect={() => pick(genre)}
                className={commandItemClasses}
              >
                {genre.name}
                {genre.pending ? (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    em análise
                  </span>
                ) : null}
              </Command.Item>
            ))}
            {similar &&
            !matches.some((genre) => genre.slug === similar.slug) ? (
              <Command.Item
                value={`parecido-${similar.slug}`}
                onSelect={() => pick(similar)}
                className={commandItemClasses}
              >
                Você quis dizer “{similar.name}”?
              </Command.Item>
            ) : null}
            {canCreate ? (
              <Command.Item
                value="criar"
                onSelect={create}
                className={commandItemClasses}
              >
                <Plus />
                {creating ? "Criando…" : `Criar “${typed}”`}
              </Command.Item>
            ) : null}
            {matches.length === 0 && !similar && !canCreate ? (
              <p className="px-3 py-2.5 text-sm text-muted-foreground">
                Esse você já escolheu.
              </p>
            ) : null}
          </Command.List>
        ) : null}
      </Command>
      {error ? (
        <p id={`${id}-erro`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
