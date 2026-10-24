"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { springs } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { bookColor, pickInk } from "../lib/color";
import { spineHeight, spineWidth } from "../lib/spine";
import type { BookVisual } from "../types";

const MotionLink = motion.create(Link);

type BookSpineProps = {
  book: BookVisual;
  /** Em destaque: sai alguns pixels da prateleira (spec §3, momento 5). */
  lifted?: boolean;
  /** Deslocamento lateral quando a vizinha está em destaque, em px. */
  shift?: number;
  onActivate?: () => void;
  onDeactivate?: () => void;
};

/**
 * Lombada (spec §4): cor da capa, título na vertical com contraste
 * automático, largura pelas páginas e altura variando pelo id. O título
 * desce de cima para baixo, como pede a ABNT.
 */
export function BookSpine({
  book,
  lifted = false,
  shift = 0,
  onActivate,
  onDeactivate,
}: BookSpineProps) {
  const color = bookColor(book);
  const width = spineWidth(book.pageCount);
  const author = book.authors[0] ?? "";

  return (
    <MotionLink
      href={routes.book(book.id)}
      aria-label={author ? `${book.title}, de ${author}` : book.title}
      data-lifted={lifted}
      onPointerEnter={onActivate}
      onPointerLeave={onDeactivate}
      onFocus={onActivate}
      onBlur={onDeactivate}
      animate={{ y: lifted ? -10 : 0, x: shift }}
      transition={springs.smooth}
      style={{
        width,
        height: spineHeight(book.id),
        ...({ "--cover": color } as React.CSSProperties),
      }}
      className={cn(
        "spine relative flex shrink-0 flex-col items-center justify-between overflow-hidden rounded-[3px] bg-(--cover) py-3",
        pickInk(color) === "ink" ? "text-ink" : "text-paper",
      )}
    >
      <span className="max-h-[calc(100%-3rem)] truncate font-serif text-[13px] leading-none [writing-mode:vertical-rl]">
        {book.title}
      </span>
      {width >= 24 && author ? (
        <span className="max-h-10 truncate font-mono text-[8px] leading-none tracking-wider uppercase opacity-70 [writing-mode:vertical-rl]">
          {author}
        </span>
      ) : null}
    </MotionLink>
  );
}
