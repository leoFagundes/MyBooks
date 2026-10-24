"use client";

import { AnimatePresence, motion } from "motion/react";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Texto que muda sem pular: o antigo sobe e some enquanto o novo entra
 * ("Seguir" → "Seguindo"), com AnimatePresence em popLayout (spec §3, momento 7).
 */
export function SwapText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex overflow-hidden", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          initial={{ opacity: 0, y: "60%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "-60%" }}
          transition={springs.snappy}
          className="inline-block whitespace-nowrap"
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
