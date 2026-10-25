"use client";

import { motion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { ViewTransition } from "react";
import { springs } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { bookColor, coverInk } from "../lib/color";
import { spineHeight, spineWidth } from "../lib/spine";
import { coverName } from "../lib/transition-names";
import type { BookVisual } from "../types";
import { useBookLinkBehavior } from "./book-link";

const MotionLink = motion.create(Link);

type BookSpineProps = {
  book: BookVisual;
  /** Para onde a lombada leva (padrão: a página do livro). */
  href?: Route;
  /** Em destaque: sai alguns pixels da prateleira (spec §3, momento 5). */
  lifted?: boolean;
  /** Deslocamento lateral quando a vizinha está em destaque, em px. */
  shift?: number;
  onActivate?: () => void;
  onDeactivate?: () => void;
};

/**
 * Lombada (spec §4): cor da capa, título na vertical com contraste AA
 * garantido, largura pelas páginas e altura variando pelo id. O título
 * desce de cima para baixo, como pede a ABNT. Apertada, vira a origem da
 * viagem até a página do livro, onde se transforma na capa. Na volta, a
 * capa gira de novo até ela: a classe do par vem de quem chega.
 */
export function BookSpine({
  book,
  href,
  lifted = false,
  shift = 0,
  onActivate,
  onDeactivate,
}: BookSpineProps) {
  const { background, ink } = coverInk(bookColor(book));
  const width = spineWidth(book.pageCount);
  const author = book.authors[0] ?? "";
  const { source, props } = useBookLinkBehavior({
    bookId: book.id,
    variant: "spine",
    handlers: { onPointerEnter: onActivate, onFocus: onActivate },
  });

  return (
    <ViewTransition
      name={source.isSource ? coverName(book.id) : undefined}
      share="vira-lombada"
      default="none"
    >
      <MotionLink
        href={href ?? routes.book(book.id)}
        aria-label={author ? `${book.title}, de ${author}` : book.title}
        data-lifted={lifted}
        {...props}
        onPointerLeave={onDeactivate}
        onBlur={onDeactivate}
        animate={{ y: lifted ? -10 : 0, x: shift }}
        transition={springs.smooth}
        style={{
          width,
          height: spineHeight(book.id),
          ...({ "--cover": background } as React.CSSProperties),
        }}
        className={cn(
          "spine relative flex shrink-0 flex-col items-center justify-between overflow-hidden rounded-cover bg-(--cover) py-3",
          ink === "ink" ? "text-ink" : "text-paper",
        )}
      >
        <span className="max-h-[calc(100%-3rem)] truncate font-serif text-[13px] leading-none [writing-mode:vertical-rl]">
          {book.title}
        </span>
        {width >= 24 && author ? (
          <span className="max-h-10 truncate font-mono text-[8px] leading-none tracking-wider uppercase [writing-mode:vertical-rl]">
            {author}
          </span>
        ) : null}
      </MotionLink>
    </ViewTransition>
  );
}
