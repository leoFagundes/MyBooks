"use client";

import { Star } from "lucide-react";
import { motion } from "motion/react";
import { useId, useRef, useState } from "react";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { MAX_RATING, ratingAt, ratingLabel, stepRating } from "../lib/rating";

const STARS = Array.from({ length: MAX_RATING }, (_, index) => index + 1);

/**
 * Nota de meia a cinco estrelas. Pelo teclado é um controle deslizante (setas
 * andam meia estrela, 1 a 5 vão direto, Delete tira a nota); com o mouse, a
 * metade esquerda de cada estrela vale meia. Clicar na nota que já está tira.
 */
export function StarRating({
  value,
  onChange,
  label = "Nota",
  className,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  label?: string;
  className?: string;
}) {
  const id = useId();
  const track = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  function pointerRating(clientX: number) {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return ratingAt((clientX - rect.left) / rect.width);
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span id={`${id}-rotulo`} className="sr-only">
        {label}
      </span>
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-labelledby={`${id}-rotulo`}
        aria-valuemin={0}
        aria-valuemax={MAX_RATING}
        aria-valuenow={value ?? 0}
        aria-valuetext={ratingLabel(value)}
        onKeyDown={(event) => {
          const next = stepRating(value, event.key);
          if (next === undefined) return;
          event.preventDefault();
          onChange(next);
        }}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse") {
            setHover(pointerRating(event.clientX));
          }
        }}
        onPointerLeave={() => setHover(null)}
        onClick={(event) => {
          const next = pointerRating(event.clientX);
          onChange(next === value ? null : next);
        }}
        className="-m-1 flex cursor-pointer touch-manipulation items-center gap-1 rounded-control p-1"
      >
        {STARS.map((star) => {
          // 0, meia ou cheia
          const fill = Math.max(0, Math.min(1, (shown ?? 0) - (star - 1)));
          return (
            <span key={star} aria-hidden className="relative size-7">
              <Star
                strokeWidth={1.5}
                className="absolute inset-0 size-7 text-border-strong"
              />
              {fill > 0 ? (
                <motion.span
                  key={fill}
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    clipPath: fill < 1 ? "inset(0 50% 0 0)" : undefined,
                  }}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={springs.snappy}
                >
                  <Star
                    strokeWidth={1.5}
                    className="size-7 fill-current text-foreground"
                  />
                </motion.span>
              ) : null}
            </span>
          );
        })}
      </div>
      <span
        aria-hidden
        className="min-w-24 font-mono text-xs text-muted-foreground"
      >
        {ratingLabel(shown)}
      </span>
    </div>
  );
}
