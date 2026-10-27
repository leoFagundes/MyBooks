"use client";

import { motion } from "motion/react";
import { pressScale, springs } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { GENRES, type GenreSlug } from "../genres";

export const MAX_GENRES = 10;

/** Os gêneros do MyBooks como botões de liga e desliga, até 10. */
export function GenreChips({
  value,
  onChange,
}: {
  value: GenreSlug[];
  onChange: (genres: GenreSlug[]) => void;
}) {
  const full = value.length >= MAX_GENRES;

  function toggle(slug: GenreSlug) {
    onChange(
      value.includes(slug)
        ? value.filter((genre) => genre !== slug)
        : full
          ? value
          : [...value, slug],
    );
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
                className={cn(
                  "h-9 cursor-pointer rounded-full border px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-surface text-foreground hover:bg-muted",
                )}
              >
                {genre.label}
              </motion.button>
            </li>
          );
        })}
      </ul>
      <p className="font-mono text-xs text-muted-foreground">
        {value.length} de {MAX_GENRES}
        {full ? " · chegou ao limite" : ""}
      </p>
    </div>
  );
}
