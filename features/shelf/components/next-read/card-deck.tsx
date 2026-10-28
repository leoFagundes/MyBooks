"use client";

import { BookOpen } from "lucide-react";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent } from "react";
import { BookCover } from "@/features/books/components/book-cover";
import { COVER_RADIUS_PX } from "@/features/books/lib/cover";
import type { BookVisual } from "@/features/books/types";
import { springs, staggerDelay, tweens } from "@/lib/motion";

/** Até 7 cartas na mesa, mesmo com a fila maior. */
export const MAX_CARDS = 7;

// Uma pilha arrumada à mão: cada carta um pouco torta, a de cima reta
const TILT = [-3, 2, -1.5, 2.5, -2, 1, 0];

// Quantas vezes o baralho se divide e se intercala
const ROUNDS = 2;

const rest = (index: number, count: number) => ({
  x: "0%",
  y: (count - 1 - index) * 2,
  rotate: TILT[MAX_CARDS - count + index] ?? 0,
  opacity: 1,
  scale: 1,
});

/** O verso da carta: o invertido do botão primário, com um livro no meio. */
function CardBack() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-primary text-primary-foreground backface-hidden"
      style={{ borderRadius: COVER_RADIUS_PX }}
    >
      <span
        aria-hidden
        className="absolute inset-2 border border-primary-foreground/20"
        style={{ borderRadius: COVER_RADIUS_PX }}
      />
      <BookOpen className="size-8" strokeWidth={1.5} aria-hidden />
    </div>
  );
}

/**
 * O sorteio (spec §5.4): as cartas se dividem em dois montes e se intercalam,
 * duas vezes; a de cima, que é a sorteada, sobe e vira mostrando a capa. Com
 * movimento reduzido, a capa aparece de frente, só com opacidade.
 */
export function CardDeck({
  book,
  count,
  onRevealed,
}: {
  book: BookVisual;
  /** Quantas cartas (até 7). */
  count: number;
  onRevealed: () => void;
}) {
  const [scope, animate] = useAnimate();
  const reduced = useReducedMotion() ?? false;
  const revealed = useEffectEvent(onRevealed);
  const cards = Math.max(1, Math.min(count, MAX_CARDS));
  const top = cards - 1;

  useEffect(() => {
    let active = true;
    const card = (index: number) => `[data-card="${index}"]`;
    const all = Array.from({ length: cards }, (_, index) => index);

    async function shuffle() {
      if (reduced) {
        await animate(card(top), { opacity: 1 }, tweens.base);
        if (active) revealed();
        return;
      }
      for (let round = 0; round < ROUNDS && cards > 1; round++) {
        // Divide: um monte para cada lado, a de cima primeiro
        await Promise.all(
          all.map((index) => {
            const left = (index + round) % 2 === 0;
            return animate(
              card(index),
              {
                x: left ? "-45%" : "45%",
                y: rest(index, cards).y - 6,
                rotate: left ? -7 : 7,
              },
              { ...springs.snappy, delay: (top - index) * staggerDelay },
            );
          }),
        );
        if (!active) return;
        // Intercala: as cartas caem de baixo para cima, alternando os montes
        await Promise.all(
          all.map((index) =>
            animate(card(index), rest(index, cards), {
              ...springs.snappy,
              delay: index * staggerDelay,
            }),
          ),
        );
        if (!active) return;
      }
      // As outras saem, e a sorteada sobe e vira
      for (const index of all.slice(0, top)) {
        void animate(
          card(index),
          { opacity: 0, y: rest(index, cards).y + 10, scale: 0.97 },
          tweens.fast,
        );
      }
      await animate(card(top), { y: -10, scale: 1.04 }, springs.smooth);
      if (!active) return;
      await animate(
        `${card(top)} [data-flip]`,
        { rotateY: 180 },
        springs.gentle,
      );
      if (active) revealed();
    }

    void shuffle();
    return () => {
      active = false;
    };
  }, [animate, cards, top, reduced]);

  return (
    <div ref={scope} className="relative mx-auto aspect-2/3 w-36 sm:w-44">
      {Array.from({ length: cards }, (_, index) =>
        index === top ? (
          <motion.div
            key={index}
            data-card={index}
            // A perspectiva fica no pai da carta que vira
            className="absolute inset-0 perspective-[1200px]"
            style={{ zIndex: index }}
            initial={reduced ? { opacity: 0 } : rest(index, cards)}
          >
            {reduced ? (
              <BookCover
                book={book}
                size="lg"
                tilt={false}
                className="w-full"
              />
            ) : (
              <div data-flip className="relative size-full transform-3d">
                <CardBack />
                <div className="absolute inset-0 rotate-y-180 backface-hidden">
                  <BookCover
                    book={book}
                    size="lg"
                    tilt={false}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </motion.div>
        ) : reduced ? null : (
          <motion.div
            key={index}
            data-card={index}
            aria-hidden
            className="absolute inset-0"
            style={{ zIndex: index }}
            initial={rest(index, cards)}
          >
            <CardBack />
          </motion.div>
        ),
      )}
    </div>
  );
}
