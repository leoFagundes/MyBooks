"use client";

import { createPortal } from "react-dom";
import { coverName } from "../lib/transition-names";
import { BookCover } from "./book-cover";
import { useReturningCover } from "./cover-transition";

/**
 * Na volta para uma origem que ainda carrega (no dev, sem prefetch, ou depois
 * de uma Server Action, que esvazia o cache do roteador), o esqueleto dela
 * segura a capa onde ela estava no topo da página do livro. As duas formam
 * par sem sair do lugar (classe fica) e, quando o conteúdo chega, a capa voa
 * até a origem. Vai só no esqueleto do conteúdo que tem os links: com o
 * conteúdo na tela ele some, e o nome capa-<id> nunca se repete.
 */
export function ReturningCover() {
  const returning = useReturningCover();
  if (!returning) return null;
  const { book, left, top } = returning;
  // No body: um ancestral com transform prenderia o fixed
  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed z-10"
      style={{ left, top }}
    >
      <BookCover
        book={book}
        size="hero"
        tilt={false}
        sourceImage
        transitionName={coverName(book.id)}
        transitionShare="fica"
      />
    </div>,
    document.body,
  );
}
