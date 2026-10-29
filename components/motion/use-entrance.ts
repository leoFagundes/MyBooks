"use client";

import { useAnimationControls, useInView } from "motion/react";
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * A entrada (spec §3, momento 3) sem esconder nada no HTML do servidor: o
 * que já está na tela ao montar aparece na hora, sem esperar o JavaScript (o
 * LCP pode estar ali), e o que está abaixo da dobra se esconde antes de
 * alguém ver e entra quando aparece, uma vez.
 */
export function useEntrance(
  ref: React.RefObject<Element | null>,
  amount: number,
) {
  const controls = useAnimationControls();
  const inView = useInView(ref, { once: true, amount });
  const below = useRef(false);

  useLayoutEffect(() => {
    const box = ref.current?.getBoundingClientRect();
    if (box && box.top > window.innerHeight) {
      below.current = true;
      controls.set("hidden");
    }
  }, [controls, ref]);

  useEffect(() => {
    if (inView && below.current) void controls.start("visible");
  }, [controls, inView]);

  return controls;
}
