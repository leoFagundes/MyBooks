import {
  genreSlug,
  sameGenre,
  similarGenre,
} from "@/features/profile/lib/genre-name";
import { isFeatureOn } from "@/features/admin/queries";
import { getVisibleGenres } from "@/features/profile/queries";
import { foldText } from "@/lib/text-match";

const headers = { "Cache-Control": "private, no-store" };

// O combobox de gêneros (MELHORIAS 5.4): os que combinam com o que a pessoa
// digita, o igual (sem acento nem caixa), se houver, e um parecido para o
// "Você quis dizer…". Leitura por GET: o cliente despacha actions uma por vez
export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "")
    .trim()
    .slice(0, 40);
  try {
    const [genres, creating] = await Promise.all([
      getVisibleGenres(),
      isFeatureOn("criar_generos"),
    ]);
    if (query.length < 2) {
      return Response.json(
        { matches: [], same: null, similar: null, creating },
        { headers },
      );
    }
    const key = foldText(query);
    const slug = genreSlug(query);
    const matches = genres
      .filter(
        (genre) =>
          foldText(genre.name).includes(key) ||
          (slug.length > 0 && genre.slug.includes(slug)),
      )
      .slice(0, 8);
    const same = sameGenre(query, genres);
    const similar = same ? null : similarGenre(query, genres);
    return Response.json({ matches, same, similar, creating }, { headers });
  } catch {
    return Response.json({}, { status: 502 });
  }
}
