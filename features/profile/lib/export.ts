import "server-only";
import { byPosition } from "@/features/collections/lib/position";
import { toCsv } from "@/features/shelf/lib/csv";
import type { ShelfStatus } from "@/features/shelf/schemas";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ExportedShelfEntry = {
  title: string;
  authors: string[];
  isbn13: string | null;
  pageCount: number | null;
  publishedYear: number | null;
  status: ShelfStatus;
  rating: number | null;
  review: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  currentPage: number | null;
  addedAt: string;
};

export type AccountExport = {
  exportedAt: string;
  profile: {
    username: string;
    displayName: string | null;
    bio: string | null;
    favoriteGenres: string[];
    isPrivate: boolean;
    createdAt: string;
  };
  shelf: ExportedShelfEntry[];
  quotes: {
    book: string;
    authors: string[];
    text: string;
    page: number | null;
    createdAt: string;
  }[];
  collections: {
    title: string;
    description: string | null;
    emoji: string | null;
    visibility: string;
    collaborative: boolean;
    createdAt: string;
    books: { title: string; authors: string[]; note: string | null }[];
  }[];
  following: string[];
  followers: string[];
  likedCollections: { title: string; owner: string }[];
  savedCollections: { title: string; owner: string }[];
};

// O PostgREST devolve no máximo mil linhas por vez: a estante e as citações
// de quem lê muito vêm em páginas
const PAGE = 1000;

async function fetchAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: unknown;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Tudo o que é da pessoa, para o "Exportar meus dados" (lido com a sessão dela). */
export async function buildAccountExport(
  supabase: Supabase,
  userId: string,
): Promise<AccountExport> {
  const [
    profile,
    shelf,
    quotes,
    collections,
    following,
    followers,
    likes,
    saves,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "username, display_name, bio, favorite_genres, is_private, created_at",
      )
      .eq("id", userId)
      .single(),
    fetchAll((from, to) =>
      supabase
        .from("user_books")
        .select(
          "status, rating, review, started_at, finished_at, current_page, created_at, book:books(title, authors, isbn_13, page_count, published_year)",
        )
        .eq("user_id", userId)
        .order("created_at")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("quotes")
        .select("text, page, created_at, book:books(title, authors)")
        .eq("user_id", userId)
        .order("created_at")
        .range(from, to),
    ),
    supabase
      .from("collections")
      .select(
        "title, description, emoji, visibility, is_collaborative, created_at, items:collection_items(position, note, book:books(id, title, authors))",
      )
      .eq("owner_id", userId)
      .order("created_at"),
    supabase
      .from("follows")
      .select("profile:profiles!follows_following_id_fkey(username)")
      .eq("follower_id", userId)
      .eq("status", "accepted"),
    supabase
      .from("follows")
      .select("profile:profiles!follows_follower_id_fkey(username)")
      .eq("following_id", userId)
      .eq("status", "accepted"),
    supabase
      .from("collection_likes")
      .select(
        "collection:collections(title, profile:profiles!collections_owner_id_fkey(username))",
      )
      .eq("user_id", userId),
    supabase
      .from("collection_saves")
      .select(
        "collection:collections(title, profile:profiles!collections_owner_id_fkey(username))",
      )
      .eq("user_id", userId),
  ]);
  for (const result of [
    profile,
    collections,
    following,
    followers,
    likes,
    saves,
  ]) {
    if (result.error) throw result.error;
  }
  if (!profile.data) throw new Error("Perfil não encontrado");

  const titles = (
    rows: {
      collection: {
        title: string;
        profile: { username: string } | null;
      } | null;
    }[],
  ) =>
    rows.flatMap(({ collection }) =>
      collection
        ? [
            {
              title: collection.title,
              owner: collection.profile?.username ?? "",
            },
          ]
        : [],
    );

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      username: profile.data.username,
      displayName: profile.data.display_name,
      bio: profile.data.bio,
      favoriteGenres: profile.data.favorite_genres,
      isPrivate: profile.data.is_private,
      createdAt: profile.data.created_at,
    },
    shelf: shelf.flatMap((entry) =>
      entry.book
        ? [
            {
              title: entry.book.title,
              authors: entry.book.authors,
              isbn13: entry.book.isbn_13,
              pageCount: entry.book.page_count,
              publishedYear: entry.book.published_year,
              // O check de user_books só deixa os quatro status
              status: entry.status as ShelfStatus,
              rating: entry.rating,
              review: entry.review,
              startedAt: entry.started_at,
              finishedAt: entry.finished_at,
              currentPage: entry.current_page,
              addedAt: entry.created_at,
            },
          ]
        : [],
    ),
    quotes: quotes.flatMap((quote) =>
      quote.book
        ? [
            {
              book: quote.book.title,
              authors: quote.book.authors,
              text: quote.text,
              page: quote.page,
              createdAt: quote.created_at,
            },
          ]
        : [],
    ),
    collections: (collections.data ?? []).map((collection) => ({
      title: collection.title,
      description: collection.description,
      emoji: collection.emoji,
      visibility: collection.visibility,
      collaborative: collection.is_collaborative,
      createdAt: collection.created_at,
      books: [...collection.items]
        .sort(byPosition((item) => item.book?.id ?? ""))
        .flatMap((item) =>
          item.book
            ? [
                {
                  title: item.book.title,
                  authors: item.book.authors,
                  note: item.note,
                },
              ]
            : [],
        ),
    })),
    following: (following.data ?? []).flatMap(({ profile: person }) =>
      person ? [person.username] : [],
    ),
    followers: (followers.data ?? []).flatMap(({ profile: person }) =>
      person ? [person.username] : [],
    ),
    likedCollections: titles(likes.data ?? []),
    savedCollections: titles(saves.data ?? []),
  };
}

const GOODREADS_SHELF: Record<ShelfStatus, string> = {
  read: "read",
  reading: "currently-reading",
  want: "to-read",
  abandoned: "did-not-finish",
};

const goodreadsDate = (value: string | null) =>
  value ? value.slice(0, 10).replaceAll("-", "/") : null;

/**
 * A estante no CSV do Goodreads: outros apps de leitura importam esse
 * formato. A nota do Goodreads é inteira, então meia estrela arredonda.
 */
export function shelfToGoodreadsCsv(shelf: ExportedShelfEntry[]): string {
  return toCsv([
    [
      "Title",
      "Author",
      "Additional Authors",
      "ISBN13",
      "My Rating",
      "Exclusive Shelf",
      "Date Read",
      "Date Added",
      "My Review",
      "Number of Pages",
      "Year Published",
    ],
    ...shelf.map((entry) => [
      entry.title,
      entry.authors[0] ?? "",
      entry.authors.slice(1).join(", "),
      entry.isbn13,
      entry.rating === null ? 0 : Math.round(entry.rating),
      GOODREADS_SHELF[entry.status],
      goodreadsDate(entry.finishedAt),
      goodreadsDate(entry.addedAt),
      entry.review,
      entry.pageCount,
      entry.publishedYear,
    ]),
  ]);
}
