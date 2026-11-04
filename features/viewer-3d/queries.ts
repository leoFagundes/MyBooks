import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { openLibraryPublicReading } from "@/features/books/lib/open-library";
import { getBookDiscussions } from "@/features/community/queries";
import { getViewer } from "@/lib/auth";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { type BookCopy, type MyCopy, quoteKey } from "./lib/copy";

/**
 * A leitura pública da obra (domínio público na Open Library), guardada por
 * um dia. Falha lança erro, para não ficar guardada.
 */
async function publicReading(bookId: string) {
  "use cache";
  cacheLife("days");
  cacheTag(`book:${bookId}`);
  const { data } = await createPublicClient()
    .from("books")
    .select("source, source_id")
    .eq("id", bookId)
    .maybeSingle();
  if (data?.source !== "openlibrary" || !data.source_id) return null;
  const reading = await openLibraryPublicReading(data.source_id);
  if (reading === undefined) throw new Error("Open Library indisponível");
  return reading;
}

/**
 * O exemplar de quem vê (a estante, as citações e de quem veio), quem mais
 * guardou cada trecho, as discussões do fórum e, em domínio público, onde
 * ler. Lê com a sessão: a RLS esconde o que é de perfil privado.
 */
export async function getBookCopy(bookId: string): Promise<BookCopy> {
  const viewer = await getViewer();
  const supabase = await createClient();
  const [entry, mine, all, discussions, reading] = await Promise.all([
    viewer
      ? supabase
          .from("user_books")
          .select(
            "status, current_page, rating, review, created_at, from:profiles!user_books_copied_from_user_id_fkey(username)",
          )
          .eq("user_id", viewer.id)
          .eq("book_id", bookId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    viewer
      ? supabase
          .from("quotes")
          .select("text, page")
          .eq("user_id", viewer.id)
          .eq("book_id", bookId)
          .order("page", { ascending: true, nullsFirst: false })
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("quotes")
      .select(
        "text, page, user_id, reader:profiles!quotes_user_id_fkey(username)",
      )
      .eq("book_id", bookId)
      .limit(300),
    getBookDiscussions(bookId).catch(() => []),
    publicReading(bookId).catch(() => null),
  ]);

  const savedBy: Record<string, string[]> = {};
  const counts = new Map<
    string,
    { text: string; page: number | null; count: number }
  >();
  for (const quote of all.data ?? []) {
    const key = quoteKey(quote.text);
    if (!key) continue;
    const seen = counts.get(key);
    counts.set(key, {
      text: seen?.text ?? quote.text,
      page: seen?.page ?? quote.page,
      count: (seen?.count ?? 0) + 1,
    });
    const username = quote.reader?.username;
    if (!username || quote.user_id === viewer?.id) continue;
    const people = (savedBy[key] ??= []);
    if (!people.includes(username)) people.push(username);
  }
  const top = [...counts.values()].sort((a, b) => b.count - a.count)[0];

  const row = entry.data;
  const copy: MyCopy | null =
    viewer && row
      ? {
          displayName: viewer.displayName,
          status: row.status as MyCopy["status"],
          currentPage: row.current_page,
          rating: row.rating,
          review: row.review,
          addedAt: row.created_at,
          copiedFrom: row.from?.username ?? null,
          quotes: mine.data ?? [],
        }
      : null;

  return {
    mine: copy,
    savedBy,
    mostSaved: top && top.count >= 2 ? top : null,
    discussions: discussions.slice(0, 3).map((topic) => ({
      id: topic.id,
      title: topic.title,
      replies: topic.replyCount,
    })),
    reading,
  };
}
