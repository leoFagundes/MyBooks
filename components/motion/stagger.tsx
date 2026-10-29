"use client";

import { motion, stagger, useReducedMotion } from "motion/react";
import { useRef } from "react";
import {
  entranceTransition,
  entranceVariants,
  staggerDelay,
  tweens,
} from "@/lib/motion";
import { useEntrance } from "./use-entrance";

/**
 * Grupo cujos itens entram em sequência de 35ms, uma vez (spec §3, momento
 * 3). O que já está na tela ao carregar aparece sem esperar o JavaScript.
 */
export function Stagger({
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useEntrance(ref, 0.15);
  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={controls}
      variants={{
        hidden: {},
        visible: { transition: { delayChildren: stagger(staggerDelay) } },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.div
      variants={entranceVariants}
      transition={entranceTransition(reduced, tweens.slow)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
