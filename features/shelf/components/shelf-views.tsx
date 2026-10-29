"use client";

import { LayoutGrid, LibraryBig, List } from "lucide-react";
import { motion } from "motion/react";
import type { Route } from "next";
import {
  addTransitionType,
  startTransition,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  ViewTransition,
} from "react";
import { flushSync } from "react-dom";
import type { SegmentedOption } from "@/components/ui/segmented-control";
import { BookCover } from "@/features/books/components/book-cover";
import { BookLink } from "@/features/books/components/book-link";
import { useTransitionSource } from "@/features/books/components/cover-transition";
import { Shelf } from "@/features/books/components/shelf";
import {
  ViewSwitchScope,
  ViewSwitchTarget,
} from "@/features/books/components/view-switch";
import { titleName, viewName } from "@/features/books/lib/transition-names";
import type { BookVisual } from "@/features/books/types";
import { formatNumber } from "@/lib/format";
import { staggerDelay, tweens } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ShelfView } from "../lib/view";

export type { ShelfView } from "../lib/view";

export const shelfViewOptions = [
  { value: "estante", label: "Estante", icon: LibraryBig },
  { value: "grade", label: "Grade", icon: LayoutGrid },
  { value: "lista", label: "Lista", icon: List },
] as const satisfies readonly SegmentedOption<ShelfView>[];

const hasCovers = (view: ShelfView) => view !== "estante";

/** O tipo da transição, de onde sai a classe do par (veja ViewSwitchTarget). */
function switchType(from: ShelfView, to: ShelfView) {
  if (hasCovers(from) && hasCovers(to)) return "vista-capas";
  return hasCovers(to) ? "vista-vira-capa" : "vista-vira-lombada";
}

// O stagger: 35ms por livro, sem passar de 210ms entre o primeiro e o último
const STAGGER_MS = staggerDelay * 1000;
const STAGGER_TOTAL_MS = 210;
// Na Estante cabem uma centena de lombadas na tela: viajam as primeiras, e o
// resto troca no crossfade da página (cada viagem custa uma medida e uma
// camada a mais)
const MAX_TRAVELERS = 48;

type SwitchPlan = {
  /** O livro do topo da tela e onde ele estava: depois da troca, fica lá. */
  anchor: { id: string; top: number } | null;
  /** O atraso de cada livro na tela, na ordem de leitura. */
  delays: Map<string, number>;
};

const NO_TRAVELERS: ReadonlySet<string> = new Set();

// Quanto tempo a folha do stagger fica na página: a troca termina antes
const STAGGER_SHEET_MS = 3000;

/**
 * O stagger: uma folha de estilo com o atraso de cada livro que viaja, posta
 * antes da transição. O navegador já cria as animações atrasadas; atrasar
 * depois, pelo JS, custaria uma varredura de todas as animações por livro.
 */
function staggerSheet(scope: string, delays: ReadonlyMap<string, number>) {
  const rules = [...delays]
    .filter(([, delay]) => delay > 0)
    .map(([bookId, delay]) => {
      const name = viewName(scope, bookId);
      return `::view-transition-group(${name}), ::view-transition-image-pair(${name}), ::view-transition-old(${name}), ::view-transition-new(${name}) { animation-delay: ${delay}ms !important; }`;
    });
  if (rules.length === 0) return;
  const sheet = document.createElement("style");
  sheet.dataset.viewStagger = "";
  sheet.textContent = rules.join(" ");
  document.head.append(sheet);
  setTimeout(() => sheet.remove(), STAGGER_SHEET_MS);
}

/** Onde termina a barra do topo, que fica na tela na rolagem. */
function topBarBottom() {
  return (
    document.querySelector("[data-top-bar]")?.getBoundingClientRect().bottom ??
    0
  );
}

/** A vista atual, medida no clique: os livros na tela, de cima para baixo. */
function measureSwitch(container: HTMLElement): SwitchPlan {
  const top = Math.max(0, topBarBottom());
  const visible: { id: string; top: number }[] = [];
  for (const item of container.querySelectorAll<HTMLElement>(
    "[data-view-item]",
  )) {
    const rect = item.getBoundingClientRect();
    // Os itens seguem a ordem de leitura: daqui para a frente, tudo está abaixo
    if (rect.top >= window.innerHeight) break;
    // Mais da metade à vista, abaixo da barra
    if (rect.top + rect.height / 2 > top) {
      visible.push({ id: item.dataset.viewItem ?? "", top: rect.top });
    }
  }
  const travelers = visible.slice(0, MAX_TRAVELERS);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const step =
    reduced || travelers.length < 2
      ? 0
      : Math.min(STAGGER_MS, STAGGER_TOTAL_MS / (travelers.length - 1));
  return {
    anchor: visible[0] ?? null,
    delays: new Map(
      travelers.map((item, index) => [item.id, Math.round(index * step)]),
    ),
  };
}

/**
 * A vista da estante e a troca entre as três (spec §3, momento 2). `change`
 * mede a vista atual (o livro do topo e o stagger) e troca dentro de uma
 * transição com o tipo certo: cada livro viaja até a forma nova. `setView`
 * troca sem a viagem, com fade (a demonstração da landing, que troca
 * sozinha). Sem View Transitions no navegador, tudo é fade.
 */
export function useShelfViewSwitch(initial: ShelfView | (() => ShelfView)) {
  const [state, setState] = useState(() => ({
    view: typeof initial === "function" ? initial() : initial,
    fade: false,
    fades: 0,
    /** Os livros que viajam na troca em curso: só eles levam nome na vista nova. */
    traveling: NO_TRAVELERS,
  }));
  const scope = useId();
  const container = useRef<HTMLDivElement>(null);
  const plan = useRef<SwitchPlan | null>(null);

  function setView(next: ShelfView) {
    plan.current = null;
    setState((current) => ({
      view: next,
      fade: true,
      fades: current.fades + 1,
      traveling: NO_TRAVELERS,
    }));
  }

  function change(next: ShelfView) {
    if (next === state.view) return;
    if (!("startViewTransition" in document)) {
      setView(next);
      return;
    }
    const measured = container.current
      ? measureSwitch(container.current)
      : null;
    plan.current = measured;
    const traveling: ReadonlySet<string> = new Set(measured?.delays.keys());
    if (measured) staggerSheet(scope, measured.delays);
    // Primeiro, os livros da tela ganham o nome na vista que sai (só eles: o
    // React mede cada nome, e são centenas de livros). Ele só começa a
    // transição quando nomeia quem sai
    flushSync(() => setState((current) => ({ ...current, traveling })));
    startTransition(() => {
      addTransitionType(switchType(state.view, next));
      setState((current) => ({
        ...current,
        view: next,
        fade: false,
        traveling,
      }));
    });
  }

  /** O livro do topo no clique, uma vez só (a vista nova o põe no lugar). */
  function takeAnchor() {
    const anchor = plan.current?.anchor ?? null;
    if (plan.current) plan.current.anchor = null;
    return anchor;
  }

  return {
    view: state.view,
    fade: state.fade,
    /** Quantas trocas com fade: muda só nelas (o layoutDependency da landing). */
    fades: state.fades,
    change,
    setView,
    container,
    /** Os nomes da troca: o escopo, quem viaja e o stagger (ViewSwitchScope). */
    names: { id: scope, traveling: state.traveling },
    takeAnchor,
  };
}

export type ShelfViewSwitch = ReturnType<typeof useShelfViewSwitch>;

type BookHref = (book: BookVisual) => Route;

const toBookPage: BookHref = (book) => routes.book(book.id);

/**
 * O que acompanha cada livro na estante de outra pessoa (o Copiar ou o selo
 * "Na sua estante"). `active`: na Estante, a lombada em destaque.
 */
export type BookAction = (
  book: BookVisual,
  place: ShelfView,
  active: boolean,
) => React.ReactNode;

type ShelfViewsProps = {
  books: BookVisual[];
  /** A vista e a troca (useShelfViewSwitch), com o controle em outro lugar. */
  switcher: ShelfViewSwitch;
  /** Para onde cada livro leva (padrão: a página do livro). */
  bookHref?: BookHref;
  bookAction?: BookAction;
  className?: string;
};

/**
 * As três visualizações do perfil (spec §5): Estante (lombadas), Grade
 * (capas) e Lista (tabela compacta). Na troca, cada livro é o mesmo nas três
 * (ViewSwitchTarget): a capa voa até a outra capa e a lombada gira pela quina
 * até virar capa, com um stagger leve. Só o que está na tela viaja; o resto
 * troca no crossfade da página. O livro do topo da tela continua no mesmo
 * lugar.
 */
export function ShelfViews({
  books,
  switcher,
  bookHref = toBookPage,
  bookAction,
  className,
}: ShelfViewsProps) {
  const { view, fade, container, names, takeAnchor } = switcher;

  // Antes de a transição medir a vista nova: a página rola até o livro do
  // topo voltar para onde estava no clique
  useLayoutEffect(() => {
    const anchor = takeAnchor();
    if (!anchor) return;
    const item = container.current?.querySelector(
      `[data-view-item="${CSS.escape(anchor.id)}"]`,
    );
    if (!item) return;
    const offset = item.getBoundingClientRect().top - anchor.top;
    if (Math.abs(offset) > 1) {
      window.scrollTo({ top: window.scrollY + offset, behavior: "instant" });
    }
  }, [view, container, takeAnchor]);

  return (
    <ViewSwitchScope value={names}>
      <div ref={container} className={cn("relative", className)}>
        <motion.div
          key={view}
          initial={fade ? { opacity: 0 } : false}
          animate={{ opacity: 1, transition: tweens.base }}
        >
          {view === "estante" ? (
            <Shelf
              books={books}
              label="Estante"
              bookHref={bookHref}
              accessory={
                bookAction
                  ? (book, active) => bookAction(book, "estante", active)
                  : undefined
              }
            />
          ) : view === "grade" ? (
            <CoverGrid
              books={books}
              bookHref={bookHref}
              bookAction={bookAction}
            />
          ) : (
            <BookTable
              books={books}
              bookHref={bookHref}
              bookAction={bookAction}
            />
          )}
        </motion.div>
      </div>
    </ViewSwitchScope>
  );
}

function CoverGrid({
  books,
  bookHref,
  bookAction,
}: {
  books: BookVisual[];
  bookHref: BookHref;
  bookAction?: BookAction;
}) {
  return (
    <ul
      aria-label="Grade de capas"
      className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6"
    >
      {books.map((book) => (
        <li
          key={book.id}
          data-view-item={book.id}
          data-copy-item={bookAction ? "" : undefined}
          className="group/livro relative"
        >
          <BookLink
            book={book}
            href={bookHref(book)}
            aria-label={book.title}
            data-copy-source
            className="block rounded-cover"
          >
            <ViewSwitchTarget book={book}>
              <BookCover book={book} size="fill" />
            </ViewSwitchTarget>
          </BookLink>
          {bookAction ? (
            <div className="absolute top-1.5 right-1.5">
              {bookAction(book, "grade", false)}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function BookTable({
  books,
  bookHref,
  bookAction,
}: {
  books: BookVisual[];
  bookHref: BookHref;
  bookAction?: BookAction;
}) {
  const cell = "border-b border-border py-3 group-last:border-b-0";

  return (
    <table
      aria-label="Lista de livros"
      className="w-full border-separate border-spacing-0 text-left"
    >
      <thead>
        <tr className="font-mono text-[11px] tracking-wide text-muted-foreground uppercase">
          <th scope="col" className="w-14 pb-2 font-normal">
            <span className="sr-only">Capa</span>
          </th>
          <th scope="col" className="pb-2 font-normal">
            Livro
          </th>
          <th scope="col" className="hidden pb-2 font-normal sm:table-cell">
            Ano
          </th>
          <th scope="col" className="pb-2 text-right font-normal">
            Páginas
          </th>
        </tr>
      </thead>
      <tbody>
        {books.map((book) => (
          <BookRow
            key={book.id}
            book={book}
            href={bookHref(book)}
            cell={cell}
            action={bookAction?.(book, "lista", false)}
          />
        ))}
      </tbody>
    </table>
  );
}

function BookRow({
  book,
  href,
  cell,
  action,
}: {
  book: BookVisual;
  href: Route;
  cell: string;
  action?: React.ReactNode;
}) {
  // Capa e título da linha são a mesma origem: os dois viajam juntos
  const source = useTransitionSource(book);

  return (
    <tr
      data-view-item={book.id}
      data-copy-item={action ? "" : undefined}
      className="group group/livro"
    >
      <td className="py-2 pr-4 align-middle">
        {/* O título já é o link para leitores de tela e teclado */}
        <BookLink
          book={book}
          href={href}
          source={source}
          tabIndex={-1}
          aria-hidden
          data-copy-source
          className="block rounded-cover"
        >
          <ViewSwitchTarget book={book}>
            <BookCover book={book} size="xs" tilt={false} />
          </ViewSwitchTarget>
        </BookLink>
      </td>
      <td className={cn(cell, "pr-4")}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <BookLink
              book={book}
              href={href}
              source={source}
              className="font-serif text-lg leading-tight tracking-tight"
            >
              {/* Uma caixa só, do tamanho do texto, como o título do topo */}
              <ViewTransition
                name={source.isSource ? titleName(book.id) : undefined}
                share="titulo"
                default="none"
              >
                <span className="inline-block text-balance hover:underline hover:decoration-border-strong hover:underline-offset-4">
                  {book.title}
                </span>
              </ViewTransition>
            </BookLink>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {book.authors.join(", ")}
            </p>
          </div>
          {action}
        </div>
      </td>
      <td
        className={cn(
          cell,
          "hidden pr-4 font-mono text-xs text-muted-foreground sm:table-cell",
        )}
      >
        {book.publishedYear ?? "—"}
      </td>
      <td
        className={cn(
          cell,
          "text-right font-mono text-xs text-muted-foreground",
        )}
      >
        {book.pageCount === null ? "—" : formatNumber(book.pageCount)}
      </td>
    </tr>
  );
}
