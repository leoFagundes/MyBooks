import { ImageResponse } from "next/og";
import { getCollectionCard } from "@/features/collections/queries";
import { formatNumber } from "@/lib/format";
import { ogCoverData } from "@/lib/og/cover";
import { ogFonts } from "@/lib/og/fonts";
import { genericOgImage } from "@/lib/og/generic";
import { clip, OG_SIZE, OgFan, OgWordmark } from "@/lib/og/parts";
import { ogColors } from "@/lib/og/theme";

export const alt = "Uma coleção no MyBooks";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * A coleção (spec §7): emoji, título, "por @dono", quantos livros e o leque.
 * Coleção privada fica com a imagem genérica.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await getCollectionCard(id).catch(() => null);
  if (!collection) return genericOgImage("Uma coleção no MyBooks");

  const fan = await Promise.all(
    collection.covers.map(async (book) => ({
      ...book,
      image: await ogCoverData(book.coverUrl, "M"),
    })),
  );
  const title = clip(collection.title, 60);
  const books =
    collection.bookCount === 1
      ? "1 livro"
      : `${formatNumber(collection.bookCount)} livros`;

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
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {collection.emoji ? (
            <span style={{ fontSize: 84, lineHeight: 1 }}>
              {collection.emoji}
            </span>
          ) : null}
          <span
            style={{
              fontFamily: "Instrument Serif",
              fontSize: title.length <= 28 ? 80 : 62,
              lineHeight: 1.02,
              color: ogColors.foreground,
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontFamily: "Geist Mono",
              fontSize: 24,
              letterSpacing: "0.03em",
              color: ogColors.muted,
            }}
          >
            {`por @${collection.owner.username} · ${books}`}
          </span>
          {collection.description ? (
            <span
              style={{
                fontFamily: "Geist",
                fontSize: 28,
                lineHeight: 1.35,
                color: ogColors.foreground,
              }}
            >
              {clip(collection.description, 110)}
            </span>
          ) : null}
        </div>
        <OgWordmark />
      </div>
      {fan.length > 0 ? <OgFan books={fan} width={150} /> : null}
    </div>,
    { ...OG_SIZE, fonts: [...ogFonts] },
  );
}
