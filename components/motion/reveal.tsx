"use client";

import { motion, useReducedMotion } from "motion/react";
import { entranceVariants, tweens } from "@/lib/motion";

type RevealProps = React.ComponentProps<typeof motion.div> & { delay?: number };

/**
 * Entra uma vez, quando aparece na tela: fade + 8px para cima + blur 4px→0
 * (spec §3, momento 3). Com movimento reduzido, só opacidade.
 */
export function Reveal({ delay = 0, children, ...props }: RevealProps) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.div
      variants={entranceVariants(reduced)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ ...tweens.slow, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
