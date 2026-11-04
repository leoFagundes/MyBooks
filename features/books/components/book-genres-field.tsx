"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { GenreSearch } from "@/features/profile/components/genre-chips";
import { genreLabel } from "@/features/profile/genres";
import type { Genre } from "@/features/profile/lib/genre-name";
import { pressScale, springs, tweens } from "@/lib/motion";
import { BOOK_GENRES_MAX } from "../schemas";

/**
 * Os gêneros do livro cadastrado à mão: digitar filtra os que já existem (os
 * oficiais e os dos leitores) e, se for um novo, oferece criar (fica em
 * análise até a aprovação). Os escolhidos ficam em chips, com o X para tirar.
 */
export function BookGenresField({
  value,
  onChange,
  known = {},
}: {
  value: string[];
  onChange: (genres: string[]) => void;
  /** O nome dos gêneros de leitores que o livro já tem (na edição). */
  known?: Record<string, string>;
}) {
  const id = useId();
  const [names, setNames] = useState<Record<string, Genre>>(() =>
    Object.fromEntries(
      Object.entries(known).map(([slug, name]) => [slug, { slug, name }]),
    ),
  );
  const full = value.length >= BOOK_GENRES_MAX;

  function add(genre: Genre) {
    setNames((current) => ({ ...current, [genre.slug]: genre }));
    if (!value.includes(genre.slug) && !full) onChange([...value, genre.slug]);
  }

  return (
    <div className="flex flex-col gap-2">
      <p id={`${id}-rotulo`} className="text-sm font-medium">
        Gêneros{" "}
        <span className="font-normal text-muted-foreground">(opcional)</span>
      </p>
      {value.length > 0 ? (
        <ul aria-labelledby={`${id}-rotulo`} className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {value.map((slug) => {
              const genre = names[slug];
              const name = genreLabel(slug) ?? genre?.name ?? slug;
              return (
                <motion.li
                  key={slug}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0.9,
                    transition: tweens.fast,
                  }}
                  transition={springs.snappy}
                >
                  <motion.button
                    type="button"
                    aria-label={`Tirar ${name}`}
                    onClick={() =>
                      onChange(value.filter((genre) => genre !== slug))
                    }
                    whileTap={{ scale: pressScale }}
                    transition={springs.snappy}
                    className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-foreground bg-foreground px-3 text-sm text-background"
                  >
                    {name}
                    {genre?.pending ? (
                      <span className="font-mono text-[11px] opacity-70">
                        em análise
                      </span>
                    ) : null}
                    <X className="size-3.5" strokeWidth={1.5} aria-hidden />
                  </motion.button>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      ) : null}
      <GenreSearch
        selected={value}
        disabled={full}
        onPick={add}
        label="Buscar ou criar um gênero"
        placeholder="Fantasia, romance, terror…"
      />
      <p className="font-mono text-xs text-muted-foreground">
        {value.length} de {BOOK_GENRES_MAX}
      </p>
    </div>
  );
}
