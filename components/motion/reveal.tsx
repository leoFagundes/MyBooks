"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { entranceTransition, entranceVariants, tweens } from "@/lib/motion";
import { useEntrance } from "./use-entrance";

type RevealProps = React.ComponentProps<typeof motion.div> & { delay?: number };

/**
 * Entra uma vez, quando aparece na tela: fade + 8px para cima + blur 4px→0
 * (spec §3, momento 3). Com movimento reduzido, só a opacidade anima. O que
 * já está na tela ao carregar aparece sem esperar o JavaScript.
 */
export function Reveal({ delay = 0, children, ...props }: RevealProps) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const controls = useEntrance(ref, 0.2);
  return (
    <motion.div
      ref={ref}
      variants={entranceVariants}
      initial={false}
      animate={controls}
      transition={entranceTransition(reduced, { ...tweens.slow, delay })}
      {...props}
    >
      {children}
    </motion.div>
  );
}
