import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { toBookVisual } from "@/features/books/lib/to-book-visual";
import type { BookVisual } from "@/features/books/types";
import { getAffinityReaders, toReader } from "@/features/social/queries";
import type { Reader } from "@/features/social/types";
import { createClient } from "@/lib/supabase/server";

const BOOK =
  "id, title, authors, cover_url, cover_color, cover_style, page_count, published_year";
const PERSON = "id, username, display_name, avatar_url";

/** Uma citação para o Início: o trecho, o livro e quem guardou. */
export type HomeQuote = {
  id: string;
  text: string;
  page: number | null;
  book: BookVisual;
  reader: Reader;
};

/**
 * As citações de quem vê e de quem ela segue (as mais novas), para o Início
 * escolher uma a cada visita. A RLS decide o que de perfil privado aparece.
 */
export async function getHomeQuotes(viewerId: string): Promise<HomeQuote[]> {
  "use cache: private";
  cacheLife("minutes");
  cacheTag(`shelf:${viewerId}`, `feed:${viewerId}`);

  const supabase = await createClient();
  const { data: follows, error: followsError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", viewerId)
    .eq("status", "accepted")
    .limit(200);
  if (followsError) throw followsError;
  const people = [viewerId, ...follows.map((row) => row.following_id)];
  const { data, error } = await supabase
    .from("quotes")
    .select(
      `id, text, page, book:books!quotes_book_id_fkey(${BOOK}), reader:profiles!quotes_user_id_fkey(${PERSON})`,
    )
    .in("user_id", people)
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) throw error;
  return data.flatMap((row) =>
    row.book && row.reader
      ? [
          {
            id: row.id,
            text: row.text,
            page: row.page,
            book: toBookVisual(row.book),
            reader: toReader(row.reader),
          },
        ]
      : [],
  );
}

/** Um livro que leitores parecidos leram e que quem vê ainda não tem. */
export type AffinityPick = {
  book: BookVisual;
  /** Quem leu, do mais parecido ao menos (até três). */
  readers: Reader[];
};

/**
 * "Leitores parecidos leram": os livros lidos (e bem avaliados primeiro) por
 * quem tem mais afinidade com quem vê, fora os que ela já tem. A afinidade
 * vem do banco (readers_by_affinity); a RLS respeita os perfis privados.
 */
export async function getAffinityPicks(
  viewerId: string,
  ownedIds: string[],
  limit = 4,
): Promise<AffinityPick[]> {
  "use cache: private";
  cacheLife("minutes");
  cacheTag(`shelf:${viewerId}`, `feed:${viewerId}`);

  const readers = (await getAffinityReaders(8)) ?? [];
  if (readers.length === 0) return [];
  const order = new Map(readers.map((reader, index) => [reader.id, index]));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_books")
    .select(`user_id, rating, book:books!user_books_book_id_fkey(${BOOK})`)
    .in(
      "user_id",
      readers.map((reader) => reader.id),
    )
    .eq("status", "read")
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) throw error;

  const owned = new Set(ownedIds);
  const picks = new Map<
    string,
    { book: BookVisual; readers: string[]; best: number; score: number }
  >();
  for (const row of data) {
    if (!row.book || owned.has(row.book.id)) continue;
    const rank = order.get(row.user_id) ?? readers.length;
    const pick = picks.get(row.book.id) ?? {
      book: toBookVisual(row.book),
      readers: [],
      best: rank,
      score: 0,
    };
    pick.readers.push(row.user_id);
    pick.best = Math.min(pick.best, rank);
    // Mais leitores e notas altas sobem; sem nota, conta como 3
    pick.score += (row.rating ?? 3) + 2;
    picks.set(row.book.id, pick);
  }
  const byId = new Map(readers.map((reader) => [reader.id, reader]));
  return [...picks.values()]
    .sort((a, b) => b.score - a.score || a.best - b.best)
    .slice(0, limit)
    .map((pick) => ({
      book: pick.book,
      readers: pick.readers
        .sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
        .slice(0, 3)
        .flatMap((id) => {
          const reader = byId.get(id);
          return reader
            ? [
                {
                  id: reader.id,
                  username: reader.username,
                  displayName: reader.displayName,
                  avatarUrl: reader.avatarUrl,
                },
              ]
            : [];
        }),
    }));
}
