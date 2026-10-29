"use client";

import { motion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { ViewTransition } from "react";
import { springs } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { spineHeight, spineWidth } from "../lib/spine";
import { coverName } from "../lib/transition-names";
import type { BookVisual } from "../types";
import { useBookLinkBehavior } from "./book-link";
import { SpineArt, spineColors } from "./spine-art";
import { ViewSwitchTarget } from "./view-switch";

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
 * garantido, largura pelas páginas e altura variando pelo id, no estilo da
 * capa (SpineArt). Apertada, vira a origem da viagem até a página do livro,
 * onde se transforma na capa. Na volta, a capa gira de novo até ela: a
 * classe do par vem de quem chega. Na troca de vista da estante, é o mesmo
 * livro que a capa da Grade e da Lista (ViewSwitchTarget).
 */
export function BookSpine({
  book,
  href,
  lifted = false,
  shift = 0,
  onActivate,
  onDeactivate,
}: BookSpineProps) {
  const { background } = spineColors(book);
  const width = spineWidth(book.pageCount);
  const author = book.authors[0] ?? "";
  const { source, props } = useBookLinkBehavior({
    book,
    variant: "spine",
    handlers: { onPointerEnter: onActivate, onFocus: onActivate },
  });

  return (
    <ViewSwitchTarget book={book}>
      <ViewTransition
        name={source.isSource ? coverName(book.id) : undefined}
        share="vira-lombada"
        default="none"
      >
        <MotionLink
          href={href ?? routes.book(book.id)}
          aria-label={author ? `${book.title}, ${author}` : book.title}
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
          className="spine relative block shrink-0 overflow-hidden rounded-cover bg-(--cover)"
        >
          <SpineArt book={book} width={width} />
        </MotionLink>
      </ViewTransition>
    </ViewSwitchTarget>
  );
}
