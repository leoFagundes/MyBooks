import { cn } from "@/lib/utils";
import { bookColor, coverInk } from "../lib/color";
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
 * espessura deixar. A Moldura ganha dois fios; a Faixa, o painel de papel com
 * o título; a Mínima fica só com o título. Ocupa a caixa de quem a desenha
 * (BookSpine e a prévia do cadastro), que pinta o fundo.
 */
export function SpineArt({ book, width }: { book: BookVisual; width: number }) {
  const { inkClass } = spineColors(book);
  const author = width >= 24 ? (book.authors[0] ?? "") : "";

  if (book.coverStyle === "band") {
    return (
      <>
        <span className="absolute inset-x-0 top-[14%] bottom-[24%] flex justify-center overflow-hidden bg-paper py-2 text-ink">
          <span className={titleClass}>{book.title}</span>
        </span>
        {author ? (
          <span
            className={cn(
              "absolute inset-x-0 bottom-0 flex h-[24%] justify-center overflow-hidden py-2",
              inkClass,
            )}
          >
            {" "}
            <span className={authorClass}>{author}</span>
          </span>
        ) : null}
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

  const framed = book.coverStyle === "framed";
  return (
    <span
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-between gap-1.5 overflow-hidden",
        framed ? "py-4" : "py-3",
        inkClass,
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
