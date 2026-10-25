"use client";

import { AnimatePresence, motion } from "motion/react";
import { tweens } from "@/lib/motion";

/** Aviso do formulário, lido pelo leitor de tela assim que aparece. */
export function FormAlert({ message }: { message: string | null | undefined }) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0, transition: tweens.base }}
          exit={{ opacity: 0, transition: tweens.fast }}
          className="rounded-control border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
        >
          {message}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
