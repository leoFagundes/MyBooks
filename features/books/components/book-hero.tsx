import { ViewTransition } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewIn3D } from "@/features/viewer-3d/components/view-in-3d";
import { formatNumber } from "@/lib/format";
import { coverName, titleName } from "../lib/transition-names";
import type { BookVisual } from "../types";
import { BookCover } from "./book-cover";
import { Synopsis } from "./synopsis";

// A classe do par vem do tipo da navegação, que o BookLink marca. Sem tipo, é
// a página chegando depois do esqueleto, que já tinha capa e título no lugar:
// o par só troca de foto (fica), sem voar de novo
const coverShare = {
  "livro-lombada": "vira-capa",
  "livro-capa": "capa",
  default: "fica",
};
const titleShare = { "livro-capa": "titulo", default: "fica" };

/**
 * Topo da página do livro, destino da viagem da capa. A capa sempre leva o
 * nome capa-<id>: vinda de uma lombada, gira pela quina até ficar de frente
 * (classe vira-capa); vinda de uma capa, só voa (classe capa). O título leva
 * titulo-<id> e viaja quando a origem também tem título (a Lista); senão,
 * chega com a página. Ele abraça o texto para crescer na escala da fonte.
 * Com `pending`, é o esqueleto: capa e título já aparecem, o resto carrega.
 */
export function BookHero({
  book,
  description,
  pending = false,
  actions,
}: {
  book: BookVisual;
  description: string | null;
  pending?: boolean;
  /** Embaixo do texto: o "Editar livro" de quem o cadastrou. */
  actions?: React.ReactNode;
}) {
  const meta = [
    book.publishedYear,
    book.pageCount ? `${formatNumber(book.pageCount)} páginas` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="grid items-start gap-8 sm:grid-cols-[auto_1fr] sm:gap-12">
      <ViewIn3D book={book} description={description} pending={pending}>
        <BookCover
          book={book}
          size="hero"
          preload
          sourceImage
          transitionName={coverName(book.id)}
          transitionShare={coverShare}
        />
      </ViewIn3D>
      <div className="flex flex-col gap-4 sm:pt-6">
        <ViewTransition
          name={titleName(book.id)}
          share={titleShare}
          default="none"
        >
          <h1 className="w-fit font-serif text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">
            {book.title}
          </h1>
        </ViewTransition>
        {pending ? (
          <HeroTextSkeleton />
        ) : (
          <>
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
            {actions}
          </>
        )}
      </div>
    </section>
  );
}

/** Autoria, ano e sinopse enquanto chegam, nas medidas do texto de verdade. */
export function HeroTextSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-3 w-1/4" />
      <div className="flex flex-col gap-2 pt-2">
        <Skeleton className="h-4 w-full max-w-prose" />
        <Skeleton className="h-4 w-full max-w-prose" />
        <Skeleton className="h-4 w-2/3 max-w-prose" />
      </div>
    </>
  );
}
