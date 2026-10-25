"use client";

import { motion, useReducedMotion } from "motion/react";
import { EmptyShelfIllustration } from "@/components/ui/illustrations";
import { BookCover } from "@/features/books/components/book-cover";
import type { BookVisual } from "@/features/books/types";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

const MAX_COVERS = 5;

// Cada capa gira e se afasta conforme a distância até o centro do leque; o
// deslocamento em % é da largura da própria capa
function fanPose(offset: number, open: boolean) {
  const distance = Math.abs(offset);
  return open
    ? { rotate: offset * 8, x: `${offset * 40}%`, y: distance * 7 - 10 }
    : { rotate: offset * 4, x: `${offset * 24}%`, y: distance * 3 };
}

type CollectionCoverProps = {
  covers: BookVisual[];
  emoji: string | null;
  /** Leque aberto (hover ou foco no card). */
  open?: boolean;
  className?: string;
  "data-testid"?: string;
};

/**
 * Capa da coleção (spec §5.8): de 3 a 5 capas em leque, que se abre com mola.
 * Com menos capas, mostra as que houver; sem nenhuma, o emoji da coleção.
 * Com movimento reduzido, o leque fica parado.
 */
export function CollectionCover({
  covers,
  emoji,
  open = false,
  className,
  "data-testid": testId,
}: CollectionCoverProps) {
  const reduced = useReducedMotion() ?? false;
  const shown = covers.slice(0, MAX_COVERS);
  const isOpen = open && !reduced;
  const center = (shown.length - 1) / 2;

  return (
    <div
      aria-hidden
      data-open={isOpen}
      data-testid={testId}
      className={cn("relative aspect-4/3 w-full", className)}
    >
      {shown.length === 0 ? (
        <div className="flex size-full items-center justify-center rounded-card border border-dashed border-border-strong/40 text-5xl">
          {emoji ?? (
            <EmptyShelfIllustration className="w-24 text-muted-foreground" />
          )}
        </div>
      ) : (
        shown.map((book, i) => {
          const offset = i - center;
          return (
            <motion.div
              key={book.id}
              className="absolute top-[10%] left-1/2 -ml-[17%] w-[34%]"
              style={{ zIndex: 10 - Math.round(Math.abs(offset) * 2) }}
              initial={false}
              animate={fanPose(offset, isOpen)}
              transition={springs.smooth}
            >
              <BookCover book={book} size="fan" tilt={false} />
            </motion.div>
          );
        })
      )}
    </div>
  );
}
