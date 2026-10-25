"use client";

import { motion } from "motion/react";
import { useState, useTransition } from "react";
import { SwapText } from "@/components/motion/swap-text";
import { Button } from "@/components/ui/button";
import { pressScale, springs } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { saveGenres } from "../../actions";
import { GENRES, type GenreSlug } from "../../genres";
import { StepFrame } from "./step-frame";

const MAX = 10;

export function GenresStep({
  value,
  onChange,
  onBack,
  onDone,
}: {
  value: GenreSlug[];
  onChange: (genres: GenreSlug[]) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const full = value.length >= MAX;

  function toggle(slug: GenreSlug) {
    onChange(
      value.includes(slug)
        ? value.filter((genre) => genre !== slug)
        : full
          ? value
          : [...value, slug],
    );
  }

  function save() {
    setError(null);
    startSaving(async () => {
      const result = await saveGenres(value);
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <StepFrame
      title="Do que você gosta de ler?"
      description="Escolha os gêneros que mais aparecem na sua estante. Eles ajudam a achar leitores parecidos com você."
      focusTitle
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onBack}>
            Voltar
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={save}
            disabled={saving}
            aria-busy={saving}
          >
            <SwapText text={saving ? "Salvando…" : "Continuar"} />
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
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
          {value.length} de {MAX}
          {full ? " · chegou ao limite" : ""}
        </p>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </StepFrame>
  );
}
