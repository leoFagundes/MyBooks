import { ViewTransition } from "react";
import { formatNumber } from "@/lib/format";
import { coverName, titleName } from "../lib/transition-names";
import type { BookVisual } from "../types";
import { BookCover } from "./book-cover";
import { Synopsis } from "./synopsis";

/**
 * Topo da página do livro, destino da viagem da capa. A capa sempre leva o
 * nome capa-<id>: vinda de uma lombada, gira pela quina até ficar de frente
 * (classe vira-capa); vinda de uma capa, só voa (classe capa). O título leva
 * titulo-<id> e viaja quando a origem também tem título (a Lista); senão,
 * chega com a página. Ele abraça o texto para crescer na escala da fonte.
 */
export function BookHero({
  book,
  description,
}: {
  book: BookVisual;
  description: string | null;
}) {
  const meta = [
    book.publishedYear,
    book.pageCount ? `${formatNumber(book.pageCount)} páginas` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="grid items-start gap-8 sm:grid-cols-[auto_1fr] sm:gap-12">
      <BookCover
        book={book}
        size="hero"
        preload
        transitionName={coverName(book.id)}
        transitionShare={{ "livro-lombada": "vira-capa", default: "capa" }}
        className="mx-auto sm:mx-0"
      />
      <div className="flex flex-col gap-4 sm:pt-6">
        <ViewTransition name={titleName(book.id)} share="titulo" default="none">
          <h1 className="w-fit font-serif text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">
            {book.title}
          </h1>
        </ViewTransition>
        <p className="text-lg">{book.authors.join(", ")}</p>
        {meta ? (
          <p className="font-mono text-xs tracking-wide text-muted-foreground">
            {meta}
          </p>
        ) : null}
        {description ? (
          <div className="pt-2">
            <Synopsis text={description} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
