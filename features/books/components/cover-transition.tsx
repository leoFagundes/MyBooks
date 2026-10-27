"use client";

import { createContext, use, useId, useState } from "react";

// De onde a capa saiu: a página do livro usa para o "Voltar" levar a capa de volta
type Source = { bookId: string; key: string; origin: string };

const SourceContext = createContext<{
  source: Source | null;
  setSource: (source: Source) => void;
} | null>(null);

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
  return (
    <SourceContext value={{ source, setSource }}>{children}</SourceContext>
  );
}

export type TransitionSource = { isSource: boolean; markSource: () => void };

/** Origem da viagem para um livro nesta posição da tela. */
export function useTransitionSource(bookId: string): TransitionSource {
  const context = use(SourceContext);
  const key = useId();
  return {
    isSource: context?.source?.key === key && context.source.bookId === bookId,
    markSource: () =>
      context?.setSource({
        bookId,
        key,
        origin: `${window.location.pathname}${window.location.search}`,
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
 * outro caminho). O voltar do navegador não anima; este link anima.
 */
export function useBookOrigin(bookId: string): string | null {
  const source = use(SourceContext)?.source;
  return source?.bookId === bookId ? source.origin : null;
}

/** Para a capa: estou dentro do BookLink que é a origem da viagem? */
export function useIsInsideSource() {
  return use(InsideSourceContext);
}
