"use client";

import { useState, useTransition } from "react";
import { SwapText } from "@/components/motion/swap-text";
import { Button } from "@/components/ui/button";
import { saveGenres } from "../../actions";
import type { GenreSlug } from "../../genres";
import { GenreChips } from "../genre-chips";
import { StepFrame } from "./step-frame";

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
        <GenreChips value={value} onChange={onChange} />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </StepFrame>
  );
}
