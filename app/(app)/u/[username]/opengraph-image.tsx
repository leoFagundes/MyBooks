import { ImageResponse } from "next/og";
import { getProfileCard } from "@/features/profile/queries";
import { formatNumber } from "@/lib/format";
import { initials } from "@/lib/initials";
import { ogCoverData, ogImageData } from "@/lib/og/cover";
import { ogFonts } from "@/lib/og/fonts";
import { genericOgImage } from "@/lib/og/generic";
import { clip, OG_SIZE, OgFan, OgWordmark } from "@/lib/og/parts";
import { ogColors } from "@/lib/og/theme";

export const alt = "Um leitor no MyBooks";
export const size = OG_SIZE;
export const contentType = "image/png";

const count = (value: number, one: string, many: string) =>
  `${formatNumber(value)} ${value === 1 ? one : many}`;

/**
 * O perfil (spec §7): avatar, nome, @, bio, contadores e até 5 capas. Perfil
 * privado mostra só o nome.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  let card: Awaited<ReturnType<typeof getProfileCard>> = null;
  try {
    card = await getProfileCard(decodeURIComponent(username).toLowerCase());
  } catch {
    card = null;
  }
  if (!card) return genericOgImage("Um leitor no MyBooks");

  const [avatar, fan] = await Promise.all([
    ogImageData(card.avatarUrl),
    Promise.all(
      card.covers.map(async (book) => ({
        ...book,
        image: await ogCoverData(book.coverUrl, "M"),
      })),
    ),
  ]);
  const counts = card.counts
    ? [
        count(card.counts.books, "livro", "livros"),
        count(card.counts.collections, "coleção", "coleções"),
        count(card.counts.followers, "seguidor", "seguidores"),
      ].join(" · ")
    : null;

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
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- o next/og só desenha <img>
            <img
              src={avatar}
              alt=""
              width={128}
              height={128}
              style={{ borderRadius: 999, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 128,
                height: 128,
                borderRadius: 999,
                backgroundColor: ogColors.border,
                fontFamily: "Instrument Serif",
                fontSize: 54,
                color: ogColors.foreground,
              }}
            >
              {initials(card.displayName)}
            </div>
          )}
          <span
            style={{
              fontFamily: "Instrument Serif",
              fontSize: 72,
              lineHeight: 1,
              marginTop: 8,
              color: ogColors.foreground,
            }}
          >
            {clip(card.displayName, 32)}
          </span>
          <span
            style={{
              fontFamily: "Geist Mono",
              fontSize: 26,
              color: ogColors.muted,
            }}
          >
            {card.isPrivate ? "Perfil privado" : `@${card.username}`}
          </span>
          {card.bio ? (
            <span
              style={{
                fontFamily: "Geist",
                fontSize: 28,
                lineHeight: 1.35,
                color: ogColors.foreground,
              }}
            >
              {clip(card.bio, 110)}
            </span>
          ) : null}
          {counts ? (
            <span
              style={{
                fontFamily: "Geist Mono",
                fontSize: 22,
                letterSpacing: "0.03em",
                color: ogColors.muted,
              }}
            >
              {counts}
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
