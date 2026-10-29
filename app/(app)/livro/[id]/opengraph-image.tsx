import { ImageResponse } from "next/og";
import { bookColor, mixColors } from "@/features/books/lib/color";
import { getBook } from "@/features/books/queries";
import { formatNumber } from "@/lib/format";
import { ogCoverData } from "@/lib/og/cover";
import { ogFonts } from "@/lib/og/fonts";
import { genericOgImage } from "@/lib/og/generic";
import { clip, OG_SIZE, OgCover, OgWordmark } from "@/lib/og/parts";
import { ogColors } from "@/lib/og/theme";

export const alt = "Um livro no MyBooks";
export const size = OG_SIZE;
export const contentType = "image/png";

/** O livro (spec §7): a capa, o título, a autoria e o brilho da cor dele. */
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) return genericOgImage("Um livro no MyBooks");

  const image = await ogCoverData(book.coverUrl, "L");
  const glow = mixColors(bookColor(book), ogColors.background, 0.4);
  const title = clip(book.title, 80);
  const titleSize = title.length <= 24 ? 84 : title.length <= 48 ? 68 : 56;
  const details = [
    book.publishedYear,
    book.pageCount ? `${formatNumber(book.pageCount)} páginas` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: "100%",
        padding: 72,
        gap: 64,
        backgroundColor: ogColors.background,
        backgroundImage: `radial-gradient(circle at 24% 50%, ${glow}, ${ogColors.background} 58%)`,
      }}
    >
      <OgCover book={{ ...book, image }} width={300} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
          height: "100%",
          padding: "16px 0 4px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span
            style={{
              fontFamily: "Instrument Serif",
              fontSize: titleSize,
              lineHeight: 1.02,
              color: ogColors.foreground,
            }}
          >
            {title}
          </span>
          {book.authors.length > 0 ? (
            <span
              style={{
                fontFamily: "Geist",
                fontSize: 30,
                color: ogColors.muted,
              }}
            >
              {clip(book.authors.join(", "), 70)}
            </span>
          ) : null}
          {details ? (
            <span
              style={{
                fontFamily: "Geist Mono",
                fontSize: 22,
                letterSpacing: "0.04em",
                color: ogColors.muted,
              }}
            >
              {details}
            </span>
          ) : null}
        </div>
        <OgWordmark />
      </div>
    </div>,
    { ...OG_SIZE, fonts: [...ogFonts] },
  );
}
