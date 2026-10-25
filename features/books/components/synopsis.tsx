"use client";

import { motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Sinopse com "ler mais" (spec §5.6): fechada em 4 linhas; aberta, a altura
 * cresce com `layout` e o texto não deforma (`layout="position"`). O botão só
 * aparece quando o texto passa das 4 linhas.
 */
export function Synopsis({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);
  const paragraph = useRef<HTMLParagraphElement>(null);
  const id = useId();

  useEffect(() => {
    const element = paragraph.current;
    if (!element || open) return;
    // O ResizeObserver mede na primeira vez e a cada mudança de largura
    const observer = new ResizeObserver(() => {
      setClamped(element.scrollHeight > element.clientHeight + 1);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [open]);

  return (
    <div className="flex flex-col items-start gap-2">
      <motion.div
        layout
        transition={springs.smooth}
        className="overflow-hidden"
      >
        <motion.p
          ref={paragraph}
          id={id}
          layout="position"
          transition={springs.smooth}
          className={cn(
            "max-w-prose leading-relaxed text-pretty",
            !open && "line-clamp-4",
          )}
        >
          {text}
        </motion.p>
      </motion.div>
      {clamped || open ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
          className="cursor-pointer text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {open ? "ler menos" : "ler mais"}
        </button>
      ) : null}
    </div>
  );
}
