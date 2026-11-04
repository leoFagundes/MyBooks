import { cn } from "@/lib/utils";
import { bookColor, coverInk } from "../lib/color";
import { BAND } from "../lib/cover-style";
import type { BookVisual } from "../types";

/** Fundo e tinta da lombada: a cor do livro, com o contraste AA do coverInk. */
export function spineColors(book: BookVisual) {
  const { background, ink } = coverInk(bookColor(book));
  return { background, inkClass: ink === "ink" ? "text-ink" : "text-paper" };
}

const titleClass =
  "shrink-0 truncate font-serif text-[13px] leading-none [writing-mode:vertical-rl]";
const authorClass =
  "min-h-0 truncate font-mono text-[8px] leading-none tracking-wider uppercase [writing-mode:vertical-rl]";

/**
 * O que se vê na lombada (spec §4), no estilo da capa: o título na vertical,
 * descendo de cima para baixo como pede a ABNT, e a autoria no pé, se a
 * espessura deixar. A Moldura ganha dois fios; a Faixa continua a tira de
 * papel da capa, na mesma altura, com o texto por cima dela na tinta escura;
 * a Mínima fica só com o título. Ocupa a caixa de quem a desenha
 * (BookSpine e a prévia do cadastro), que pinta o fundo.
 */
export function SpineArt({ book, width }: { book: BookVisual; width: number }) {
  const { inkClass } = spineColors(book);
  const author = width >= 24 ? (book.authors[0] ?? "") : "";

  if (book.coverStyle === "band") {
    return (
      <>
        <SpineText book={book} author={author} colorClass={inkClass} />
        {/* A tira, recortada no mesmo lugar da capa, com o mesmo texto */}
        <span
          aria-hidden
          className="absolute inset-0 bg-paper"
          style={{
            clipPath: `inset(${BAND.top * 100}% 0 ${(1 - BAND.bottom) * 100}% 0)`,
          }}
        >
          <SpineText book={book} author={author} colorClass="text-ink" />
        </span>
      </>
    );
  }

  if (book.coverStyle === "minimal") {
    return (
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center overflow-hidden py-3",
          inkClass,
        )}
      >
        <span className={cn(titleClass, "max-h-full")}>{book.title}</span>
      </span>
    );
  }

  return <SpineText book={book} author={author} colorClass={inkClass} />;
}

/** Título no alto e autoria no pé: a Clássica, a Moldura e a base da Faixa. */
function SpineText({
  book,
  author,
  colorClass,
}: {
  book: BookVisual;
  author: string;
  colorClass: string;
}) {
  const framed = book.coverStyle === "framed";
  return (
    <span
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-between gap-1.5 overflow-hidden",
        framed ? "py-4" : "py-3",
        colorClass,
      )}
    >
      {framed ? (
        <>
          <span
            aria-hidden
            className="absolute inset-x-[3px] top-1.5 h-px bg-current"
          />
          <span
            aria-hidden
            className="absolute inset-x-[3px] bottom-1.5 h-px bg-current"
          />
        </>
      ) : null}
      <span className={cn(titleClass, "max-h-[calc(100%-3rem)]")}>
        {book.title}
      </span>
      {/* O espaço separa título e autor no texto (o flex não o desenha) */}{" "}
      {/* O autor fica com o que o título deixa: inteiro nos títulos curtos */}
      {author ? <span className={authorClass}>{author}</span> : null}
    </span>
  );
}
