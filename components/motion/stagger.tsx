"use client";

import { motion, stagger, useReducedMotion } from "motion/react";
import {
  entranceTransition,
  entranceVariants,
  staggerDelay,
  tweens,
} from "@/lib/motion";

/** Grupo cujos itens entram em sequência de 35ms, uma vez (spec §3, momento 3). */
export function Stagger({
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
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
