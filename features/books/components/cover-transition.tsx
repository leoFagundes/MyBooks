"use client";

import {
  createContext,
  use,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { BookVisual } from "../types";

// De onde a capa saiu: a página do livro usa para o "Voltar" levar a capa de
// volta e, enquanto não chega do servidor, para já mostrar a capa no topo
type Source = {
  book: BookVisual;
  key: string;
  origin: string;
  /** A imagem que estava na tela (currentSrc): já está no cache. */
  coverSrc: string | null;
  /** A altura do link apertado na tela, para a volta rolar até ela. */
  top: number;
};

// Quanto tempo depois do "Voltar" a origem ainda rola até a capa (no dev,
// sem cache, a página pode demorar a chegar)
const RETURN_WINDOW_MS = 5000;

/** Onde estava a capa do topo da página do livro, na hora do "Voltar". */
type Leaving = { left: number; top: number };

const SourceContext = createContext<{
  source: Source | null;
  setSource: React.Dispatch<React.SetStateAction<Source | null>>;
  /** A volta pedida pelo "Voltar", até a capa de origem aparecer. */
  leaving: Leaving | null;
  /** O "Voltar" foi apertado; `hero` é a capa do topo da página do livro. */
  markReturn: (hero: HTMLElement | null) => void;
  /** Há uma volta pendente? Responde sim uma vez só. */
  takeReturn: () => boolean;
} | null>(null);

/** A imagem que a capa mostra (a maior, se já chegou), para a volta usar. */
function displayedImage(cover: HTMLElement) {
  const images = [
    ...cover.querySelectorAll<HTMLImageElement>("img:not([aria-hidden])"),
    ...cover.querySelectorAll<HTMLImageElement>("img[aria-hidden]"),
  ];
  return (
    images.find((image) => image.complete && image.naturalWidth > 0)
      ?.currentSrc ?? null
  );
}

// Dentro de um BookLink: a capa descendente é a origem da viagem?
const InsideSourceContext = createContext(false);

/**
 * Lembra qual capa foi apertada por último. O mesmo livro pode aparecer duas
 * vezes na tela, e nome de View Transition repetido cancela a transição
 * inteira: só a instância apertada leva o nome. Com o Activity, a página de
 * origem continua montada com ele, e o voltar do navegador refaz a viagem.
 */
export function CoverTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [source, setSource] = useState<Source | null>(null);
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  // A volta pendente, para o layout effect da origem ler sem esperar render
  const pending = useRef<Leaving | null>(null);

  function markReturn(hero: HTMLElement | null) {
    const rect = hero?.getBoundingClientRect();
    const next = { left: rect?.left ?? 0, top: rect?.top ?? 0 };
    pending.current = next;
    setLeaving(rect ? next : null);
    // A capa que a origem segura enquanto carrega é a mesma imagem do topo
    const shown = hero ? displayedImage(hero) : null;
    if (shown)
      setSource((current) => current && { ...current, coverSrc: shown });
    // Sem a capa de origem a tempo (o livro saiu da estante, por exemplo)
    setTimeout(() => {
      if (pending.current !== next) return;
      pending.current = null;
      setLeaving(null);
    }, RETURN_WINDOW_MS);
  }

  function takeReturn() {
    const asked = pending.current !== null;
    pending.current = null;
    if (asked) setLeaving(null);
    return asked;
  }

  return (
    <SourceContext
      value={{ source, setSource, leaving, markReturn, takeReturn }}
    >
      {children}
    </SourceContext>
  );
}

export type TransitionSource = {
  isSource: boolean;
  /** Marca esta posição como a origem; `target` é o link apertado. */
  markSource: (target: HTMLElement) => void;
  /** O link da origem: na volta, a página rola até ele. */
  ref: React.RefObject<HTMLAnchorElement | null>;
};

/** A capa do livro que estava na tela junto do link (a imagem já carregada). */
function shownCover(target: HTMLElement, bookId: string) {
  const scope = target.closest("tr, li, figure") ?? target;
  const image = scope.querySelector<HTMLImageElement>(
    `[data-testid="capa-${CSS.escape(bookId)}"] img`,
  );
  return image?.complete && image.naturalWidth > 0 ? image.currentSrc : null;
}

/** Origem da viagem para um livro nesta posição da tela. */
export function useTransitionSource(book: BookVisual): TransitionSource {
  const context = use(SourceContext);
  const key = useId();
  const ref = useRef<HTMLAnchorElement>(null);
  const source = context?.source ?? null;
  const isSource = source?.key === key && source.book.id === book.id;

  // Na volta, antes de o React medir a capa (fora da tela, ela não viaja):
  // a página rola até a capa ficar onde estava no clique. O "Voltar" não
  // rola para o topo, e o efeito roda quando a origem reaparece.
  useLayoutEffect(() => {
    if (!isSource || !source || !ref.current || !context?.takeReturn()) return;
    const offset = ref.current.getBoundingClientRect().top - source.top;
    if (Math.abs(offset) > 1) {
      window.scrollTo({ top: window.scrollY + offset, behavior: "instant" });
    }
  });

  return {
    isSource,
    ref,
    markSource: (target) =>
      context?.setSource({
        book,
        key,
        origin: `${window.location.pathname}${window.location.search}`,
        coverSrc: shownCover(target, book.id),
        top: target.getBoundingClientRect().top,
      }),
  };
}

export function InsideSource({
  value,
  children,
}: {
  value: boolean;
  children: React.ReactNode;
}) {
  return <InsideSourceContext value={value}>{children}</InsideSourceContext>;
}

/**
 * Onde estava a capa que trouxe a pessoa até este livro, ou null (chegou por
 * outro caminho), e o aviso de volta para o link "Voltar". O voltar do
 * navegador não anima; este link anima.
 */
export function useBookOrigin(bookId: string) {
  const context = use(SourceContext);
  const source = context?.source;
  return {
    origin: source?.book.id === bookId ? source.origin : null,
    markReturn: (hero: HTMLElement | null) => context?.markReturn(hero),
  };
}

/**
 * Na volta, enquanto a origem carrega: o livro e onde a capa estava no topo
 * da página dele (o esqueleto da origem a segura ali, veja ReturningCover).
 */
export function useReturningCover() {
  const context = use(SourceContext);
  if (!context?.leaving || !context.source) return null;
  return { book: context.source.book, ...context.leaving };
}

/** O livro cuja capa está viajando até esta página, se for este. */
export function useTravelingBook(bookId: string | null): BookVisual | null {
  const source = use(SourceContext)?.source;
  return bookId && source?.book.id === bookId ? source.book : null;
}

/** A imagem da capa que estava na tela na origem, se for deste livro. */
export function useTravelingCover(bookId: string | null): string | null {
  const source = use(SourceContext)?.source;
  return bookId && source?.book.id === bookId ? source.coverSrc : null;
}

/** Para a capa: estou dentro do BookLink que é a origem da viagem? */
export function useIsInsideSource() {
  return use(InsideSourceContext);
}
