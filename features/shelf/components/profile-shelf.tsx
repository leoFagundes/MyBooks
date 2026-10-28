"use client";

import { Shuffle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyShelfIllustration,
  SearchIllustration,
} from "@/components/ui/illustrations";
import { tweens } from "@/lib/motion";
import {
  countByStatus,
  decadeOptions,
  filterShelf,
  filtersFromParams,
  filtersToParams,
  genreOptions,
  hasRefinements,
  type ShelfFilters,
  sortShelf,
} from "../lib/filters";
import type { ShelfItem } from "../queries";
import type { ShelfStatus } from "../schemas";
import { useAddBook } from "./add-book/add-book-provider";
import { BookShelfAction, CopyBookScope } from "./copy-book";
import { useNextRead } from "./next-read/next-read-provider";
import { ShelfToolbar } from "./shelf-toolbar";
import { type BookAction, ShelfViews } from "./shelf-views";

const EMPTY_STATUS: Record<ShelfStatus, string> = {
  read: "Nenhum livro lido por aqui",
  reading: "Nada sendo lido agora",
  want: "A fila de leitura está vazia",
  abandoned: "Nenhum livro abandonado",
};

/**
 * Aba Estante do perfil: status com contagens, busca, filtros, ordem e as
 * três visualizações. Tudo fica na URL (?status=&q=&genero=&nota=&ano=&ordem=
 * &vista=), sem ida ao servidor: a estante inteira já está aqui.
 */
export function ProfileShelf({
  entries,
  owner,
  ownerId,
  ownedIds,
}: {
  entries: ShelfItem[];
  /** Primeiro nome de quem é a estante; null quando é de quem está vendo. */
  owner: string | null;
  /** De quem é a estante (a origem do que se copia daqui). */
  ownerId: string;
  /**
   * Os livros que quem vê tem na própria estante (perfil de outra pessoa,
   * com conta); null no próprio perfil e para visitante.
   */
  ownedIds: string[] | null;
}) {
  const searchParams = useSearchParams();
  const filters = filtersFromParams(searchParams);
  const owned = ownedIds ? new Set(ownedIds) : undefined;
  // "Em comum" só vale para quem tem uma estante para comparar
  if (!owned) filters.common = false;
  // A busca filtra a cada letra; a URL acompanha
  const [query, setQuery] = useState(filters.q);
  const addBook = useAddBook();
  const nextRead = useNextRead();

  // replaceState conversa com o router do Next: useSearchParams acompanha sem
  // pedir a página de novo ao servidor
  function update(changes: Partial<ShelfFilters>) {
    const search = filtersToParams({ ...filters, q: query, ...changes });
    const url = `${window.location.pathname}${search.size > 0 ? `?${search}` : ""}`;
    window.history.replaceState(null, "", url);
  }

  function changeQuery(value: string) {
    setQuery(value);
    update({ q: value });
  }

  function clearAll() {
    setQuery("");
    update({
      q: "",
      status: null,
      genre: null,
      rating: null,
      decade: null,
      common: false,
    });
  }

  if (entries.length === 0) {
    return owner === null ? (
      <EmptyState
        illustration={EmptyShelfIllustration}
        title="Sua estante está esperando"
        description="Procure um livro que você leu ou quer ler e comece por ele."
        action={<Button onClick={addBook.open}>Procurar um livro</Button>}
      />
    ) : (
      <EmptyState
        illustration={EmptyShelfIllustration}
        title={`${owner} ainda não pôs livros na estante`}
        description="Quando pôr, eles aparecem aqui."
      />
    );
  }

  const current = { ...filters, q: query };
  const counts = countByStatus(
    filterShelf(entries, current, { ignoreStatus: true, ownedIds: owned }),
  );
  const visible = sortShelf(
    filterShelf(entries, current, { ownedIds: owned }),
    current.sort,
  );
  // Sortear só na própria estante, em Quero ler, entre os livros na tela
  const drawable =
    owner === null && current.status === "want" && visible.length > 0;
  // Na estante dos outros, cada livro tem o Copiar ou o selo "Na sua estante"
  const bookAction: BookAction | undefined = owned
    ? (book, place, active) => (
        <BookShelfAction
          book={book}
          fromUserId={ownerId}
          owned={owned.has(book.id)}
          place={place}
          active={active}
        />
      )
    : undefined;

  const shelf = (
    <div className="flex flex-col gap-6">
      <ShelfToolbar
        filters={current}
        query={query}
        counts={counts}
        genres={genreOptions(entries)}
        decades={decadeOptions(entries)}
        onQueryChange={changeQuery}
        onChange={update}
      />
      <AnimatePresence initial={false}>
        {drawable ? (
          <motion.div
            key="sortear"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: tweens.base }}
            exit={{ opacity: 0, transition: tweens.fast }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border px-4 py-3"
          >
            <p className="text-sm text-pretty text-muted-foreground">
              Não sabe qual começar?
            </p>
            <Button
              variant="outline"
              onClick={() => nextRead.open(visible.map((entry) => entry.book))}
            >
              <Shuffle />
              Sortear próxima leitura
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {visible.length > 0 ? (
        <ShelfViews
          books={visible.map((entry) => entry.book)}
          view={current.view}
          bookAction={bookAction}
        />
      ) : hasRefinements(current) || !current.status ? (
        <EmptyState
          illustration={SearchIllustration}
          title="Nenhum livro com esses filtros"
          description="Tente outra busca ou tire um dos filtros."
          action={
            <Button variant="outline" onClick={clearAll}>
              Limpar filtros
            </Button>
          }
        />
      ) : (
        <EmptyState
          illustration={EmptyShelfIllustration}
          title={EMPTY_STATUS[current.status]}
          action={
            <Button variant="outline" onClick={() => update({ status: null })}>
              Ver todos
            </Button>
          }
        />
      )}
    </div>
  );

  return owned ? <CopyBookScope>{shelf}</CopyBookScope> : shelf;
}
