import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { avatarSrc } from "@/features/profile/lib/avatar";
import { getPublicEnv } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { searchGoogleBooks } from "./lib/google-books";
import { searchOpenLibrary } from "./lib/open-library";
import { normalizeQuery } from "./lib/search-query";
import { dedupeResults, type SearchResult } from "./lib/search-result";
import { toBookVisual } from "./lib/to-book-visual";
import type { BookVisual } from "./types";

function catalogResult(row: Tables<"books">): SearchResult {
  const visual = toBookVisual(row);
  return {
    // O check books_source_valid só deixa as três fontes
    source: row.source as SearchResult["source"],
    sourceId: row.source_id ?? row.id,
    title: row.title,
    subtitle: row.subtitle,
    authors: row.authors,
    publishedYear: row.published_year,
    pageCount: row.page_count,
    isbn13: row.isbn_13,
    isbn10: row.isbn_10,
    language: row.language,
    genres: row.genres,
    coverUrl: visual.coverUrl,
    catalogId: row.id,
    coverColor: visual.coverColor,
  };
}

// Livro novo no catálogo chama updateTag("catalog") e aparece na hora
async function catalogResults(query: string): Promise<SearchResult[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const { data, error } = await createPublicClient().rpc("search_catalog", {
    q: query,
    max_results: 8,
  });
  if (error) throw error;
  return data.map(catalogResult);
}

// Um dia de cache por consulta. Falha lança erro em vez de devolver vazio,
// para não ficar guardada: a próxima busca tenta de novo
async function openLibraryResults(query: string): Promise<SearchResult[]> {
  "use cache";
  cacheLife("days");
  cacheTag("busca-externa");
  const results = await searchOpenLibrary(query);
  if (results === null) throw new Error("Open Library indisponível");
  return results;
}

async function googleResults(query: string): Promise<SearchResult[]> {
  "use cache";
  cacheLife("days");
  cacheTag("busca-externa");
  const results = await searchGoogleBooks(
    query,
    process.env.GOOGLE_BOOKS_API_KEY,
  );
  if (results === null) throw new Error("Google Books indisponível");
  return results;
}

async function externalResults(query: string): Promise<SearchResult[] | null> {
  const openLibrary = await openLibraryResults(query).catch(() => null);
  if (openLibrary && openLibrary.length > 0) return openLibrary;
  const google = await googleResults(query).catch(() => null);
  return google ?? openLibrary;
}

/**
 * O resultado de fora que a paleta mostrou, achado de novo na mesma busca da
 * mesma fonte (que está no cache). É o que vai para o catálogo: os dados do
 * livro nunca vêm do cliente.
 */
export async function findExternalResult(
  rawQuery: string,
  source: "openlibrary" | "google",
  sourceId: string,
): Promise<SearchResult | null> {
  const query = normalizeQuery(rawQuery);
  if (query.length < 2) return null;
  const results = await (
    source === "openlibrary" ? openLibraryResults(query) : googleResults(query)
  ).catch(() => null);
  return results?.find((result) => result.sourceId === sourceId) ?? null;
}

/**
 * De onde a busca traz livros. O catálogo responde em milissegundos e a Open
 * Library pode levar segundos: a paleta pede os dois em separado, para mostrar
 * o catálogo na hora.
 */
export type SearchScope = "all" | "catalog" | "external";

/**
 * Busca de livros (decisão 4 da Fase 0): o catálogo primeiro, depois a Open
 * Library e, se ela falhar ou não achar nada, o Google Books. A mesma obra
 * vinda de mais de uma fonte aparece uma vez, com a versão do catálogo.
 * Devolve null só quando nenhuma fonte pedida respondeu.
 */
export async function searchBooks(
  raw: string,
  scope: SearchScope = "all",
): Promise<SearchResult[] | null> {
  const query = normalizeQuery(raw);
  if (query.length < 2) return [];
  const sources: Promise<SearchResult[] | null>[] = [];
  if (scope !== "external") {
    sources.push(catalogResults(query).catch(() => null));
  }
  if (scope !== "catalog") sources.push(externalResults(query));
  const answers = await Promise.all(sources);
  if (answers.every((answer) => answer === null)) return null;
  return dedupeResults(answers.flatMap((answer) => answer ?? [])).slice(0, 20);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type BookDetails = BookVisual & {
  subtitle: string | null;
  description: string | null;
  isbn13: string | null;
  language: string | null;
  genres: string[];
};

/** O livro do catálogo, para a página dele. Id fora do formato: null (404). */
export async function getBook(id: string): Promise<BookDetails | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`book:${id}`);
  if (!UUID.test(id)) return null;

  const { data, error } = await createPublicClient()
    .from("books")
    .select(
      "id, title, subtitle, authors, description, page_count, published_year, isbn_13, language, genres, cover_url, cover_color",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...toBookVisual(data),
    subtitle: data.subtitle,
    description: data.description,
    isbn13: data.isbn_13,
    language: data.language,
    genres: data.genres,
  };
}

export type CommunityReader = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type CommunityReview = CommunityReader & {
  rating: number | null;
  review: string;
};

export type CommunityCollection = {
  id: string;
  title: string;
  emoji: string | null;
  owner: CommunityReader;
};

export type BookCommunity = {
  readers: CommunityReader[];
  readersCount: number;
  reviews: CommunityReview[];
  collections: CommunityCollection[];
};

export type CommunityQuote = {
  text: string;
  page: number | null;
  reader: CommunityReader;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

type ReaderProfile = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

function toReader(
  profile: ReaderProfile,
  supabaseUrl: string,
): CommunityReader {
  return {
    username: profile.username,
    displayName: profile.display_name?.trim() || profile.username,
    avatarUrl: avatarSrc(profile.avatar_url, supabaseUrl),
  };
}

// Até aqui uma citação cabe na folha de rosto do livro em 3D
const SHORT_QUOTE = 280;

/**
 * Citações da comunidade para o livro em 3D: as curtas primeiro, cada grupo
 * da mais nova para a mais antiga. Lê com a sessão de quem pede: a RLS
 * esconde as de perfis privados que a pessoa não segue.
 */
export async function readBookQuotes(
  supabase: Supabase,
  bookId: string,
  limit = 7,
): Promise<CommunityQuote[]> {
  const { supabaseUrl } = getPublicEnv();
  const { data, error } = await supabase
    .from("quotes")
    .select(
      "text, page, profile:profiles!quotes_user_id_fkey(username, display_name, avatar_url)",
    )
    .eq("book_id", bookId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;

  const quotes = data.flatMap(({ text, page, profile }) =>
    profile ? [{ text, page, reader: toReader(profile, supabaseUrl) }] : [],
  );
  return [
    ...quotes.filter((quote) => quote.text.length <= SHORT_QUOTE),
    ...quotes.filter((quote) => quote.text.length > SHORT_QUOTE),
  ].slice(0, limit);
}

/**
 * Quem leu, as resenhas e as coleções com o livro. Lê com a sessão: a RLS
 * esconde quem tem perfil privado e não é seguido por quem está vendo.
 */
export async function getBookCommunity(bookId: string): Promise<BookCommunity> {
  "use cache: private";
  cacheLife("minutes");
  cacheTag(`book:${bookId}`);

  const supabase = await createClient();
  const { supabaseUrl } = getPublicEnv();
  const person = (profile: ReaderProfile) => toReader(profile, supabaseUrl);

  const [readers, reviews, collections] = await Promise.all([
    supabase
      .from("user_books")
      .select(
        "profile:profiles!user_books_user_id_fkey(username, display_name, avatar_url)",
        { count: "exact" },
      )
      .eq("book_id", bookId)
      .in("status", ["read", "reading"])
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("user_books")
      .select(
        "rating, review, profile:profiles!user_books_user_id_fkey(username, display_name, avatar_url)",
      )
      .eq("book_id", bookId)
      .not("review", "is", null)
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase
      .from("collection_items")
      .select(
        "collection:collections(id, title, emoji, owner:profiles!collections_owner_id_fkey(username, display_name, avatar_url))",
      )
      .eq("book_id", bookId)
      .limit(6),
  ]);
  if (readers.error) throw readers.error;
  if (reviews.error) throw reviews.error;
  if (collections.error) throw collections.error;

  return {
    readers: readers.data.flatMap(({ profile }) =>
      profile ? [person(profile)] : [],
    ),
    readersCount: readers.count ?? readers.data.length,
    reviews: reviews.data.flatMap(({ rating, review, profile }) =>
      profile && review ? [{ ...person(profile), rating, review }] : [],
    ),
    collections: collections.data.flatMap(({ collection }) =>
      collection?.owner
        ? [
            {
              id: collection.id,
              title: collection.title,
              emoji: collection.emoji,
              owner: person(collection.owner),
            },
          ]
        : [],
    ),
  };
}

/** Busca no catálogo para o Explorar: só os livros que já estão no MyBooks. */
export async function searchCatalogBooks(raw: string): Promise<BookVisual[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const query = normalizeQuery(raw);
  if (query.length < 2) return [];
  const { data, error } = await createPublicClient().rpc("search_catalog", {
    q: query,
    max_results: 20,
  });
  if (error) throw error;
  return data.map(toBookVisual);
}

// Abaixo disso, a semana parece vazia: a seção mostra os de sempre
const MIN_WEEKLY_BOOKS = 4;

export type TrendingBooks = {
  /** true: os da semana; false: os mais adicionados de sempre. */
  weekly: boolean;
  books: (BookVisual & { adds: number })[];
};

/**
 * Livros em alta (Explorar, spec §5.9): os mais adicionados à estante na
 * semana (a view trending_books). Semana fraca vira os de sempre.
 */
export async function getTrendingBooks(limit = 12): Promise<TrendingBooks> {
  "use cache";
  cacheLife("hours");
  cacheTag("explore");
  const { data, error } = await createPublicClient()
    .from("trending_books")
    .select(
      "week_adds, total_adds, book:books(id, title, authors, cover_url, cover_color, page_count, published_year)",
    )
    .order("week_adds", { ascending: false })
    .order("total_adds", { ascending: false })
    .limit(48);
  if (error) throw error;
  const rows = data.flatMap(({ week_adds, total_adds, book }) =>
    book ? [{ week: week_adds ?? 0, total: total_adds ?? 0, book }] : [],
  );
  const week = rows.filter((row) => row.week > 0);
  const weekly = week.length >= MIN_WEEKLY_BOOKS;
  const chosen = weekly ? week : [...rows].sort((a, b) => b.total - a.total);
  return {
    weekly,
    books: chosen.slice(0, limit).map((row) => ({
      ...toBookVisual(row.book),
      adds: weekly ? row.week : row.total,
    })),
  };
}
