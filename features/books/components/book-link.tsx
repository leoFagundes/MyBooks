"use client";

import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import type { BookVisual } from "../types";
import {
  InsideSource,
  type TransitionSource,
  useTransitionSource,
} from "./cover-transition";

type Variant = "cover" | "spine";

type Handlers = {
  onPointerEnter?: React.PointerEventHandler<HTMLAnchorElement>;
  onFocus?: React.FocusEventHandler<HTMLAnchorElement>;
  onPointerDown?: React.PointerEventHandler<HTMLAnchorElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLAnchorElement>;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

/**
 * O que todo link para a página do livro precisa para a capa viajar:
 * - prefetch completo na intenção (mouse, foco ou toque), porque o par só se
 *   forma se o destino já estiver pronto no clique (receita do Next para
 *   Partial Prefetching: `true` depois da intenção, `"auto"` antes);
 * - o tipo da transição (capa ou lombada), para o destino animar do jeito certo;
 * - marcar a origem já no apertar, antes de a navegação começar.
 */
export function useBookLinkBehavior({
  book,
  variant = "cover",
  source: shared,
  handlers = {},
}: {
  book: BookVisual;
  variant?: Variant;
  source?: TransitionSource;
  handlers?: Handlers;
}) {
  const own = useTransitionSource(book);
  const source = shared ?? own;
  const [intent, setIntent] = useState(false);

  const props = {
    prefetch: intent ? true : ("auto" as const),
    transitionTypes: [variant === "spine" ? "livro-lombada" : "livro-capa"],
    "data-transition-source": source.isSource ? "true" : undefined,
    onPointerEnter: (event: React.PointerEvent<HTMLAnchorElement>) => {
      setIntent(true);
      handlers.onPointerEnter?.(event);
    },
    onFocus: (event: React.FocusEvent<HTMLAnchorElement>) => {
      setIntent(true);
      handlers.onFocus?.(event);
    },
    onPointerDown: (event: React.PointerEvent<HTMLAnchorElement>) => {
      setIntent(true);
      source.markSource();
      handlers.onPointerDown?.(event);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLAnchorElement>) => {
      if (event.key === "Enter") source.markSource();
      handlers.onKeyDown?.(event);
    },
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
      source.markSource();
      handlers.onClick?.(event);
    },
  };

  return { source, props };
}

type BookLinkProps = Omit<
  React.ComponentProps<typeof Link>,
  "href" | "prefetch" | keyof Handlers
> &
  Handlers & {
    /** O livro do link: a página dele já mostra a capa enquanto carrega. */
    book: BookVisual;
    href: Route;
    variant?: Variant;
    /** Origem compartilhada: capa e título da mesma linha viajam juntos. */
    source?: TransitionSource;
  };

/** Link para a página do livro; a capa dentro dele viaja até o destino. */
export function BookLink({
  book,
  href,
  variant,
  source,
  onPointerEnter,
  onFocus,
  onPointerDown,
  onKeyDown,
  onClick,
  children,
  ...rest
}: BookLinkProps) {
  const behavior = useBookLinkBehavior({
    book,
    variant,
    source,
    handlers: { onPointerEnter, onFocus, onPointerDown, onKeyDown, onClick },
  });

  return (
    <InsideSource value={behavior.source.isSource}>
      <Link href={href} {...rest} {...behavior.props}>
        {children}
      </Link>
    </InsideSource>
  );
}
