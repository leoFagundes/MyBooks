"use client";

import {
  cancelFrame,
  frame,
  type MotionValue,
  useMotionValue,
} from "motion/react";
import { useEffect } from "react";

// Quanto a história demora a alcançar a rolagem (maior, mais rápido): um salto
// pela barra, pelo teclado ou por uma âncora não dá tranco nos livros
const DAMPING = 8;
// Abaixo disso (menos de um px da rolagem da seção), a história encosta
const SNAP = 0.0005;

/**
 * A rolagem da seção amortecida, no frame do Motion. A página (título, linha,
 * prateleira e perfil) e a cena 3D leem este mesmo valor: a prateleira de
 * verdade só aparece com os livros 3D já pousados nela.
 */
export function useStoryProgress(scroll: MotionValue<number>) {
  const story = useMotionValue(scroll.get());

  useEffect(() => {
    function tick({ delta }: { delta: number }) {
      const target = scroll.get();
      const current = story.get();
      if (current === target) return;
      const step = 1 - Math.exp((-DAMPING * Math.min(delta, 100)) / 1000);
      const next = current + (target - current) * step;
      story.set(Math.abs(target - next) < SNAP ? target : next);
    }
    frame.update(tick, true);
    return () => cancelFrame(tick);
  }, [scroll, story]);

  return story;
}
