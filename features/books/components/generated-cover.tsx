import { cn } from "@/lib/utils";
import { BAND } from "../lib/cover-style";
import type { BookVisual } from "../types";

/** A faixa de papel do estilo Faixa, na mesma altura da capa, da lombada e do 3D. */
export const bandInset = {
  top: `${BAND.top * 100}%`,
  bottom: `${(1 - BAND.bottom) * 100}%`,
};

/**
 * Capa tipográfica, para quem não tem imagem: título em Instrument Serif e
 * autoria em Geist Mono, no estilo do livro (Clássica, Moldura, Faixa ou
 * Mínima). As medidas são frações da largura (cqi), como no canvas do 3D
 * (drawGeneratedCover). Com um botão no canto da capa (--capa-chip), o texto
 * de cima começa abaixo dele.
 */
export function GeneratedCover({
  book,
  ink,
}: {
  book: BookVisual;
  ink: "ink" | "paper";
}) {
  const authors = book.authors.join(", ");

  return (
    <div
      role="img"
      aria-label={`Capa de ${book.title}`}
      className={cn(
        "@container absolute inset-0",
        ink === "ink" ? "text-ink" : "text-paper",
      )}
    >
      {book.coverStyle === "framed" ? (
        <div className="absolute inset-x-[7cqi] top-[max(7cqi,var(--capa-chip,0px))] bottom-[7cqi] flex flex-col items-center justify-center gap-[5cqi] border-[length:max(1px,0.9cqi)] border-current px-[7cqi] py-[9cqi] text-center">
          <p className="line-clamp-4 font-serif text-[12cqi] leading-[1.05] tracking-tight text-balance">
            {book.title}
          </p>
          <span
            aria-hidden
            className="h-[max(1px,0.6cqi)] w-[16cqi] shrink-0 bg-current"
          />
          <p className="line-clamp-2 font-mono text-[5.5cqi] leading-snug tracking-wider uppercase">
            {authors}
          </p>
        </div>
      ) : book.coverStyle === "band" ? (
        <>
          {/* Na faixa de papel, a tinta escura sempre passa no contraste */}
          <div
            className="absolute inset-x-0 flex items-center justify-center bg-paper px-[9cqi] text-center text-ink"
            style={bandInset}
          >
            <p className="line-clamp-3 font-serif text-[11cqi] leading-[1.05] tracking-tight text-balance">
              {book.title}
            </p>
          </div>
          <p className="absolute inset-x-[9cqi] bottom-[9cqi] line-clamp-2 text-center font-mono text-[5.5cqi] leading-snug tracking-wider uppercase">
            {authors}
          </p>
        </>
      ) : book.coverStyle === "minimal" ? (
        <div className="absolute inset-0 flex flex-col justify-between p-[10%] pt-[max(10%,var(--capa-chip,0px))]">
          <p className="line-clamp-2 font-mono text-[5.5cqi] leading-snug tracking-wider uppercase">
            {authors}
          </p>
          <p className="line-clamp-4 font-serif text-[15cqi] leading-none tracking-tight text-balance">
            {book.title}
          </p>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col justify-between p-[10%] pt-[max(10%,var(--capa-chip,0px))]">
          <p className="line-clamp-5 font-serif text-[13cqi] leading-[1.05] tracking-tight text-balance">
            {book.title}
          </p>
          <p className="line-clamp-2 font-mono text-[6.5cqi] leading-snug tracking-wider uppercase">
            {authors}
          </p>
        </div>
      )}
    </div>
  );
}
