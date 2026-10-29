import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { toBookVisual } from "@/features/books/lib/to-book-visual";
import type { BookVisual } from "@/features/books/types";
import { getPopularCollections } from "@/features/collections/queries";
import type { CollectionVisual } from "@/features/collections/types";
import { avatarSrc } from "@/features/profile/lib/avatar";
import type { ProfileCounts, ProfileSummary } from "@/features/profile/queries";
import type { Affinity, Reader } from "@/features/social/types";
import { getPublicEnv } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";

/** As capas que flutuam no topo (12 no computador, 8 no celular). */
export const SHOWCASE_BOOKS = 12;

// Abaixo disso, a prateleira do topo fica rala demais para contar a história
const MIN_SHOWCASE_BOOKS = 6;

const BOOK_COLUMNS =
  "id, title, authors, cover_url, cover_color, cover_style, page_count, published_year";

export type LandingShowcase = {
  profile: ProfileSummary;
  counts: ProfileCounts | null;
  /** Os livros da estante, dos mexidos por último (a capa tipográfica também conta). */
  books: BookVisual[];
};

export type LandingMatch = {
  reader: Reader;
  affinity: Affinity;
  /** Até 4 livros com capa que os dois têm. */
  common: BookVisual[];
};

export type LandingQuote = {
  text: string;
  page: number | null;
  book: BookVisual;
};

export type LandingData = {
  showcase: LandingShowcase | null;
  match: LandingMatch | null;
  quote: LandingQuote | null;
  collections: CollectionVisual[];
};

/**
 * O que a landing mostra, tudo de verdade e sem sessão: o perfil vitrine (o
 * público com mais livros com capa, entre os 40 mais antigos), o leitor com
 * mais afinidade com ele, uma citação dele e as coleções populares.
 */
export async function getLandingData(): Promise<LandingData> {
  "use cache";
  cacheLife("hours");
  cacheTag("explore");

  const supabase = createPublicClient();
  const [{ data: rows }, collections] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        `id, username, display_name, avatar_url, bio, favorite_genres, user_books!user_books_user_id_fkey(book:books(${BOOK_COLUMNS}))`,
      )
      .eq("is_private", false)
      .not("onboarded_at", "is", null)
      .order("created_at", { ascending: true })
      .order("updated_at", { referencedTable: "user_books", ascending: false })
      .limit(60, { referencedTable: "user_books" })
      .limit(40),
    getPopularCollections(8).catch((): CollectionVisual[] => []),
  ]);

  const people = (rows ?? []).map((row) => {
    const books = row.user_books.flatMap(({ book }) =>
      book ? [toBookVisual(book)] : [],
    );
    return { row, books, covered: books.filter((book) => book.coverUrl) };
  });
  const best = people.reduce<(typeof people)[number] | null>(
    (top, person) =>
      !top || person.covered.length > top.covered.length ? person : top,
    null,
  );
  if (!best || best.covered.length < MIN_SHOWCASE_BOOKS) {
    return { showcase: null, match: null, quote: null, collections };
  }

  const { row } = best;
  const profile: ProfileSummary = {
    id: row.id,
    username: row.username,
    displayName: row.display_name?.trim() || row.username,
    avatarUrl: avatarSrc(row.avatar_url, getPublicEnv().supabaseUrl),
    bio: row.bio,
    favoriteGenres: row.favorite_genres,
    isPrivate: false,
  };

  // Quem tem mais livros em comum com a vitrine disputa a afinidade
  const mine = new Set(best.books.map((book) => book.id));
  const candidates = people
    .filter((person) => person !== best)
    .map((person) => ({
      person,
      common: person.covered.filter((book) => mine.has(book.id)),
    }))
    .filter((candidate) => candidate.common.length > 0)
    .sort((a, b) => b.common.length - a.common.length)
    .slice(0, 6);

  const [counts, quotes, scores] = await Promise.all([
    supabase.rpc("profile_counts", { profile_id: row.id }).single(),
    supabase
      .from("quotes")
      .select(`text, page, book:books(${BOOK_COLUMNS})`)
      .eq("user_id", row.id)
      .limit(20),
    Promise.all(
      candidates.map(async (candidate) => {
        const { data } = await supabase
          .rpc("reading_affinity", { a: row.id, b: candidate.person.row.id })
          .single();
        return data ? { ...candidate, affinity: data } : null;
      }),
    ),
  ]);

  const top = scores
    .filter((score) => score !== null)
    .sort((a, b) => b.affinity.score - a.affinity.score)[0];
  const match: LandingMatch | null = top
    ? {
        reader: {
          id: top.person.row.id,
          username: top.person.row.username,
          displayName:
            top.person.row.display_name?.trim() || top.person.row.username,
          avatarUrl: avatarSrc(
            top.person.row.avatar_url,
            getPublicEnv().supabaseUrl,
          ),
        },
        affinity: {
          score: top.affinity.score,
          commonBooks: top.affinity.common_books,
        },
        common: top.common.slice(0, 4),
      }
    : null;

  // Uma citação que caiba bem na imagem pequena
  const picked = (quotes.data ?? []).find(
    (quote) =>
      quote.book && quote.text.length >= 40 && quote.text.length <= 180,
  );
  const quote: LandingQuote | null = picked?.book
    ? { text: picked.text, page: picked.page, book: toBookVisual(picked.book) }
    : null;

  return {
    showcase: {
      profile,
      counts: counts.error ? null : counts.data,
      books: best.books.slice(0, SHOWCASE_BOOKS),
    },
    match,
    quote,
    collections,
  };
}
