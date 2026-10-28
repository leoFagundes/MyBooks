import { searchCatalogBooks } from "@/features/books/queries";
import { searchCollections } from "@/features/collections/queries";
import { readShelfBooks } from "@/features/shelf/queries";
import { searchReaders } from "@/features/social/queries";
import { createClient } from "@/lib/supabase/server";
import { matchesText } from "@/lib/text-match";

const headers = { "Cache-Control": "private, no-store" };
const nothing = { shelf: [], books: [], readers: [], collections: [] };

// A busca do ⌘K de uma vez: a estante de quem vê, o catálogo, leitores e
// coleções públicas. Leitura por GET, não por Server Action: o cliente
// despacha actions uma por vez, e a busca anda a cada letra
export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "")
    .trim()
    .slice(0, 100);
  if (query.length < 2) return Response.json(nothing, { headers });
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const viewerId = data?.claims.sub ?? null;
  try {
    const [shelf, books, readers, collections] = await Promise.all([
      viewerId ? readShelfBooks(supabase, viewerId) : [],
      searchCatalogBooks(query),
      searchReaders(query),
      searchCollections(query),
    ]);
    // O que já está na estante aparece em "Na sua estante", não em Livros
    const owned = new Set(shelf.map((book) => book.id));
    return Response.json(
      {
        shelf: shelf
          .filter((book) =>
            matchesText(`${book.title} ${book.authors.join(" ")}`, query),
          )
          .slice(0, 4),
        books: books.filter((book) => !owned.has(book.id)).slice(0, 5),
        readers: readers
          .slice(0, 4)
          .map(({ id, username, displayName, avatarUrl }) => ({
            id,
            username,
            displayName,
            avatarUrl,
          })),
        collections: collections.slice(0, 4),
      },
      { headers },
    );
  } catch {
    return Response.json(nothing, { status: 502 });
  }
}
