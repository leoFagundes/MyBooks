import { bookColor, coverInk } from "@/features/books/lib/color";
import type { BookVisual } from "@/features/books/types";
import { ogColors } from "./theme";

/** O tamanho das imagens de compartilhamento (Open Graph). */
export const OG_SIZE = { width: 1200, height: 630 };

/** O texto até `max` caracteres, com reticências se passar. */
export function clip(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** Um livro com a capa já baixada (data URI), ou null para a tipográfica. */
export type OgBook = BookVisual & { image: string | null };

/** Três lombadas e o nome em Instrument Serif, como no Logo. */
export function OgWordmark({
  size = 30,
  color = ogColors.foreground,
}: {
  size?: number;
  color?: string;
}) {
  const icon = Math.round(size * 0.9);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.35 }}>
      <svg width={icon} height={icon} viewBox="0 0 20 20">
        <rect x="2.5" y="5" width="3.5" height="12" rx="1" fill={color} />
        <rect
          x="7.75"
          y="2.5"
          width="3.5"
          height="14.5"
          rx="1"
          fill={color}
          opacity="0.5"
        />
        <rect
          x="13.4"
          y="6"
          width="3.5"
          height="11"
          rx="1"
          fill={color}
          transform="rotate(10 15.15 11.5)"
        />
      </svg>
      <span style={{ fontFamily: "Instrument Serif", fontSize: size, color }}>
        MyBooks
      </span>
    </div>
  );
}

/** A capa: a imagem baixada, ou a tipográfica na cor do livro. */
export function OgCover({ book, width }: { book: OgBook; width: number }) {
  const height = Math.round(width * 1.5);
  const color = bookColor(book);
  const generated = coverInk(color);
  const ink = generated.ink === "ink" ? ogColors.ink : ogColors.paper;
  return (
    <div
      style={{
        display: "flex",
        width,
        height,
        borderRadius: Math.max(3, Math.round(width / 60)),
        overflow: "hidden",
        backgroundColor: book.image ? color : generated.background,
        boxShadow: `0 ${Math.round(width / 12)}px ${Math.round(width / 5)}px ${ogColors.foreground}24`,
      }}
    >
      {book.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- o next/og só desenha <img>
        <img
          src={book.image}
          alt=""
          width={width}
          height={height}
          style={{ objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: Math.round(width * 0.09),
            color: ink,
          }}
        >
          <span
            style={{
              fontFamily: "Instrument Serif",
              fontSize: Math.round(width * 0.14),
              lineHeight: 1.05,
            }}
          >
            {book.title}
          </span>
          <span
            style={{
              fontFamily: "Geist Mono",
              fontSize: Math.max(10, Math.round(width * 0.06)),
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {book.authors[0] ?? ""}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Até 5 capas abertas em leque, a do meio por cima. `width` é a largura de
 * cada capa; o leque ocupa a largura que devolve `fanWidth`.
 */
export function OgFan({ books, width }: { books: OgBook[]; width: number }) {
  const count = Math.min(books.length, 5);
  const spread = (count - 1) / 4;
  const height = width * 1.5;
  const box = fanWidth(count, width);
  const slots = books.slice(0, count).map((book, index) => {
    const t = count === 1 ? 0 : -1 + (2 * index) / (count - 1);
    return {
      book,
      t,
      left: box / 2 - width / 2 + t * spread * width,
      top: Math.abs(t) * height * 0.08,
      rotate: t * (4 + 2.5 * (count - 1)),
    };
  });
  // As de fora primeiro: a do meio fica por cima
  slots.sort((a, b) => Math.abs(b.t) - Math.abs(a.t));
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: box,
        height: height * 1.14,
      }}
    >
      {slots.map(({ book, left, top, rotate }) => (
        <div
          key={book.id}
          style={{
            display: "flex",
            position: "absolute",
            left,
            top,
            transform: `rotate(${rotate}deg)`,
          }}
        >
          <OgCover book={book} width={width} />
        </div>
      ))}
    </div>
  );
}

/** A largura do leque de `count` capas de largura `width`. */
export function fanWidth(count: number, width: number) {
  const spread = (Math.min(count, 5) - 1) / 4;
  return width * (1.3 + 2 * spread);
}
