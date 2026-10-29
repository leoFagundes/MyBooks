import { ImageResponse } from "next/og";
import { getTrendingBooks } from "@/features/books/queries";
import { ogCoverData } from "@/lib/og/cover";
import { ogFonts } from "@/lib/og/fonts";
import { OG_SIZE, OgFan, OgWordmark } from "@/lib/og/parts";
import { ogColors } from "@/lib/og/theme";

export const alt = "MyBooks: sua vida de leitor, em uma estante só.";
export const size = OG_SIZE;
export const contentType = "image/png";

/** A imagem do MyBooks (spec §7): a frase, um leque de capas e a marca. */
export default async function Image() {
  const { books } = await getTrendingBooks(24);
  const fan = await Promise.all(
    books
      .filter((book) => book.coverUrl)
      .slice(0, 5)
      .map(async (book) => ({
        ...book,
        image: await ogCoverData(book.coverUrl, "M"),
      })),
  );

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: "100%",
        padding: "72px 64px 72px 80px",
        gap: 40,
        backgroundColor: ogColors.background,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
          height: "100%",
        }}
      >
        <OgWordmark size={34} />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* A quebra no lugar certo: "em" não fica sozinho no fim da linha */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "Instrument Serif",
              fontSize: 76,
              lineHeight: 1.02,
              color: ogColors.foreground,
            }}
          >
            <span>Sua vida de leitor,</span>
            <span>em uma estante só.</span>
          </div>
          <span
            style={{ fontFamily: "Geist", fontSize: 26, color: ogColors.muted }}
          >
            Estante, coleções e leitores para seguir.
          </span>
        </div>
      </div>
      {fan.length > 0 ? <OgFan books={fan} width={136} /> : null}
    </div>,
    { ...OG_SIZE, fonts: [...ogFonts] },
  );
}
