import { ImageResponse } from "next/og";
import { bookColor, coverInk } from "@/features/books/lib/color";
import { toBookVisual } from "@/features/books/lib/to-book-visual";
import { formatNumber } from "@/lib/format";
import { ogFonts } from "@/lib/og/fonts";
import { clip, OgWordmark } from "@/lib/og/parts";
import { ogColors } from "@/lib/og/theme";
import { createClient } from "@/lib/supabase/server";

const SIZE = { width: 1080, height: 1350 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Quanto maior a citação, menor a letra: cabe sempre na mesma folha
function quoteSize(length: number) {
  if (length <= 80) return 84;
  if (length <= 160) return 66;
  if (length <= 320) return 52;
  if (length <= 600) return 42;
  return 34;
}

/**
 * A citação como imagem (spec §5.6), 1080×1350 no fundo da cor do livro.
 * Lida com a sessão: a RLS decide quem vê, e quem não pode recebe 404.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/quotes/[id]/image">,
) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response(null, { status: 404 });
  const supabase = await createClient();
  const { data } = await supabase
    .from("quotes")
    .select(
      "text, page, user:profiles(username), book:books(id, title, authors, cover_url, cover_color, page_count, published_year)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data?.book || !data.user) return new Response(null, { status: 404 });

  const book = toBookVisual(data.book);
  const cover = coverInk(bookColor(book));
  const ink = cover.ink === "ink" ? ogColors.ink : ogColors.paper;
  const text = clip(data.text, 1000);
  const signature = [
    `— @${data.user.username}`,
    data.page !== null ? `p. ${formatNumber(data.page)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "96px 96px 88px",
        backgroundColor: cover.background,
        color: ink,
      }}
    >
      <span
        style={{
          fontFamily: "Instrument Serif",
          fontSize: 200,
          lineHeight: 0.8,
          height: 120,
        }}
      >
        “
      </span>
      {/* A citação fica no meio do espaço que sobra: a curta não boia no topo */}
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          padding: "24px 0 56px",
        }}
      >
        <span
          style={{
            fontFamily: "Instrument Serif",
            fontStyle: "italic",
            fontSize: quoteSize(text.length),
            lineHeight: 1.18,
          }}
        >
          {text}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            display: "flex",
            width: 96,
            height: 3,
            marginBottom: 18,
            backgroundColor: ink,
          }}
        />
        <span
          style={{
            fontFamily: "Instrument Serif",
            fontSize: 48,
            lineHeight: 1.05,
          }}
        >
          {clip(book.title, 70)}
        </span>
        {book.authors.length > 0 ? (
          <span style={{ fontFamily: "Geist", fontSize: 28 }}>
            {clip(book.authors.join(", "), 60)}
          </span>
        ) : null}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 28,
          }}
        >
          <span style={{ fontFamily: "Geist Mono", fontSize: 26 }}>
            {signature}
          </span>
          <OgWordmark size={34} color={ink} />
        </div>
      </div>
    </div>,
    {
      ...SIZE,
      fonts: [...ogFonts],
      // Conteúdo de uma pessoa, conforme quem vê: nada de cache compartilhado
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
