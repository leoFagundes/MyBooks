"use client";

import { createContext, use, ViewTransition } from "react";
import { viewName } from "../lib/transition-names";
import type { BookVisual } from "../types";

/**
 * A classe do par na troca de vista da estante, pelo tipo da transição (veja
 * useShelfViewSwitch). Entre capas, a capa voa e muda de tamanho
 * (vista-capa); da lombada para a capa e de volta, o livro gira pela quina,
 * como na ida à página do livro. `troca` marca, no CSS, o que vale só aqui.
 * Em qualquer outra transição (as navegações), nenhum nome: a viagem entre
 * páginas segue com os nomes dela.
 */
const SWITCH_CLASS = {
  "vista-capas": "vista-capa troca",
  "vista-vira-capa": "vira-capa troca",
  "vista-vira-lombada": "vira-lombada troca",
  default: "none",
};

export type ViewSwitchScopeValue = {
  /** Separa duas estantes na mesma tela (os nomes não podem se repetir). */
  id: string;
  /** Os livros que estavam na tela no clique: só eles viajam. */
  traveling: ReadonlySet<string>;
};

const ViewSwitchContext = createContext<ViewSwitchScopeValue | null>(null);

export function ViewSwitchScope({
  value,
  children,
}: {
  value: ViewSwitchScopeValue;
  children: React.ReactNode;
}) {
  return <ViewSwitchContext value={value}>{children}</ViewSwitchContext>;
}

/**
 * O livro na troca de vista: capa, lombada e miniatura da lista levam o mesmo
 * nome, e a forma viaja de uma vista para a outra. Só viajam os livros que
 * estavam na tela no clique (o React mede cada um, e são centenas): os outros
 * ficam com a classe "none". O nome é fixo desde a montagem; trocá-lo depois
 * confunde o controle de nomes repetidos do React. Quem fica fora da tela na
 * vista nova só esmaece onde estava, e o resto troca no crossfade da página.
 * Fora de uma ShelfViews, não faz nada.
 */
export function ViewSwitchTarget({
  book,
  children,
}: {
  book: BookVisual;
  children: React.ReactNode;
}) {
  const scope = use(ViewSwitchContext);
  if (!scope) return children;
  const travels = scope.traveling.has(book.id);
  return (
    <ViewTransition
      name={viewName(scope.id, book.id)}
      share={travels ? SWITCH_CLASS : "none"}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
