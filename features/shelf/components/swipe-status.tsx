"use client";

import { animate, motion, useMotionValue } from "motion/react";
import { useRef, useState } from "react";
import { springs } from "@/lib/motion";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import type { CopyStatus } from "../schemas";

const TOUCH = "(hover: none) and (pointer: coarse)";
// Cada botão de status atrás da linha, em px
const BUTTON = 76;
// Soltar além desta fração (ou rápido para a esquerda) deixa aberto
const OPEN_AT = 0.4;
const FLICK = -400;

export const STATUS_LABEL: Record<CopyStatus, string> = {
  want: "Quero ler",
  reading: "Lendo",
  read: "Lido",
};
const ORDER: CopyStatus[] = ["want", "reading", "read"];

/**
 * Deslizar a linha da Lista para a esquerda (só no toque) mostra os outros
 * status: um toque muda, e a linha volta com mola. Arrastar não abre o
 * livro; com mouse e teclado, o status muda na página do livro.
 */
export function SwipeStatus({
  status,
  onChange,
  children,
}: {
  /** O status atual (Abandonado também aparece: os três ficam atrás). */
  status: string;
  onChange: (status: CopyStatus) => void;
  children: React.ReactNode;
}) {
  const touch = useMediaQuery(TOUCH);
  const x = useMotionValue(0);
  const [open, setOpen] = useState(false);
  const dragged = useRef(false);
  const options = ORDER.filter((option) => option !== status);
  const width = options.length * BUTTON;

  if (!touch) return <>{children}</>;

  function settle(next: boolean) {
    setOpen(next);
    animate(x, next ? -width : 0, springs.snappy);
  }

  return (
    <div className="relative overflow-hidden rounded-control">
      <div
        aria-hidden={!open}
        className="absolute inset-y-0 right-0 flex items-stretch bg-muted"
        style={{ width }}
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            tabIndex={open ? 0 : -1}
            onClick={() => {
              settle(false);
              onChange(option);
            }}
            className="flex-1 cursor-pointer border-l border-border text-xs font-medium focus-visible:-outline-offset-2"
            style={{ width: BUTTON }}
          >
            {STATUS_LABEL[option]}
          </button>
        ))}
      </div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -width, right: 0 }}
        dragElastic={0.08}
        dragMomentum={false}
        style={{ x, touchAction: "pan-y" }}
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={(_, info) => {
          settle(
            info.offset.x < -width * OPEN_AT || info.velocity.x < FLICK
              ? true
              : info.offset.x > 0
                ? false
                : open && info.offset.x < width * OPEN_AT,
          );
        }}
        // Depois de arrastar (ou com a linha aberta), o toque não abre o livro
        onClickCapture={(event) => {
          if (dragged.current || open) {
            event.preventDefault();
            event.stopPropagation();
            if (!dragged.current) settle(false);
          }
          dragged.current = false;
        }}
        className={cn("relative bg-background", open && "select-none")}
      >
        {children}
      </motion.div>
    </div>
  );
}
