import { z } from "zod";
import { discoveryPage } from "@/features/books/lib/discovery";
import { getDiscoveryPool } from "@/features/books/queries";
import { GENRE_SLUGS, type GenreSlug } from "@/features/profile/genres";

const paramsSchema = z.object({
  semente: z.coerce
    .number()
    .int()
    .min(0)
    .max(2 ** 32 - 1),
  pagina: z.coerce.number().int().min(0).max(50),
  genero: z
    .string()
    .nullable()
    .transform((value) =>
      value && (GENRE_SLUGS as readonly string[]).includes(value)
        ? (value as GenreSlug)
        : null,
    ),
});

// "Populares e descobertas" do Explorar, uma página por vez, na ordem da
// semente de quem vê (a mesma a sessão inteira). Leitura por GET: o cliente
// despacha Server Actions uma por vez
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = paramsSchema.safeParse({
    semente: params.get("semente"),
    pagina: params.get("pagina") ?? 0,
    genero: params.get("genero"),
  });
  if (!parsed.success) return Response.json({}, { status: 400 });
  const { semente, pagina, genero } = parsed.data;
  try {
    const pool = await getDiscoveryPool(genero);
    const { items, next } = discoveryPage(pool, semente, pagina);
    return Response.json(
      { results: items, next },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch {
    return Response.json({}, { status: 502 });
  }
}
