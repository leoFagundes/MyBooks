import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { avatarSrc } from "@/features/profile/lib/avatar";
import { getPublicEnv } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import type { GenreSlug } from "@/features/profile/genres";
import { customGenreNames } from "@/features/profile/queries";
import { GENRE_SUBJECTS, MIXED_GENRES } from "./lib/discovery";
import { searchGoogleBooks } from "./lib/google-books";
import { isbnFromQuery } from "./lib/isbn";
import {
  openLibrarySubject,
  openLibraryTrending,
  searchOpenLibrary,
} from "./lib/open-library";
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
    coverStyle: visual.coverStyle,
  };
}

// Um ISBN (a consulta já chega como ISBN-13) acha a edição pelo número; o
// resto, pelo título e pela autoria
async function catalogRows(query: string, max: number) {
  const supabase = createPublicClient();
  const isbn = isbnFromQuery(query);
  const { data, error } = isbn
    ? await supabase
        .from("books")
        .select("*")
        .eq("isbn_13", isbn)
        .eq("moderation_status", "approved")
        .limit(max)
    : await supabase.rpc("search_catalog", { q: query, max_results: max });
  if (error) throw error;
  return data;
}

/**
 * O selo dos resultados do catálogo: em quantas estantes cada livro está (a
 * view trending_books, que só conta as estantes públicas) e, nos manuais, o @
 * de quem cadastrou.
 */
async function withCommunity(rows: Tables<"books">[]): Promise<SearchResult[]> {
  if (rows.length === 0) return [];
  const supabase = createPublicClient();
  const creators = [
    ...new Set(
      rows.flatMap((row) =>
        row.source === "manual" && row.created_by ? [row.created_by] : [],
      ),
    ),
  ];
  const [counts, people] = await Promise.all([
    supabase
      .from("trending_books")
      .select("book_id, total_adds")
      .in(
        "book_id",
        rows.map((row) => row.id),
      ),
    creators.length > 0
      ? supabase.from("profiles").select("id, username").in("id", creators)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const shelves = new Map(
    (counts.data ?? []).map((row) => [row.book_id, row.total_adds ?? 0]),
  );
  const usernames = new Map(
    (people.data ?? []).map((person) => [person.id, person.username]),
  );
  return rows.map((row) => ({
    ...catalogResult(row),
    shelves: shelves.get(row.id) ?? 0,
    addedBy: row.created_by ? (usernames.get(row.created_by) ?? null) : null,
  }));
}

// Livro novo no catálogo chama updateTag("catalog") e aparece na hora
async function catalogResults(query: string): Promise<SearchResult[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  return withCommunity(await catalogRows(query, 8));
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
  const results = dedupeResults(answers.flatMap((answer) => answer ?? []));
  return (await withoutRemoved(results)).slice(0, 20);
}

// As chaves de um resultado de fora: a obra na fonte e o ISBN-13
const outsideKeys = (result: SearchResult) => [
  `${result.source}:${result.sourceId}`,
  ...(result.isbn13 ? [`isbn:${result.isbn13}`] : []),
];

// Quais chaves são de livros que a moderação tirou (ou mesclou). Guardado
// por conjunto de chaves; excluir ou restaurar atualiza a tag catalog
async function removedKeys(keys: string[]): Promise<string[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  if (keys.length === 0) return [];
  const { data, error } = await createPublicClient().rpc("removed_book_keys", {
    keys,
  });
  if (error) throw error;
  return data ?? [];
}

/**
 * Tira dos resultados de fora os livros que a moderação excluiu do catálogo:
 * a Open Library ainda os tem, e escolhê-los não os traria de volta. Sem
 * resposta do banco, nada sai.
 */
async function withoutRemoved(results: SearchResult[]) {
  const keys = [
    ...new Set(
      results.flatMap((result) =>
        result.catalogId ? [] : outsideKeys(result),
      ),
    ),
  ].sort();
  const removed = new Set(await removedKeys(keys).catch(() => []));
  if (removed.size === 0) return results;
  return results.filter(
    (result) =>
      result.catalogId || !outsideKeys(result).some((key) => removed.has(key)),
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type BookDetails = BookVisual & {
  subtitle: string | null;
  description: string | null;
  isbn13: string | null;
  isbn10: string | null;
  language: string | null;
  genres: string[];
  /** O nome dos gêneros criados por leitores (aprovados) que o livro tem. */
  genreNames: Record<string, string>;
  /** Quem cadastrou à mão (só esse livro se edita); null nos das fontes. */
  manualCreatorId: string | null;
  /** A revisão do livro manual (MELHORIAS 7): pendente só aparece para quem criou na busca. */
  moderation: {
    status: "pending" | "approved" | "rejected";
    note: string | null;
  };
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
      "id, title, subtitle, authors, description, page_count, published_year, isbn_13, isbn_10, language, genres, cover_url, cover_color, cover_style, source, created_by, moderation_status, moderation_note",
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
    isbn10: data.isbn_10,
    language: data.language,
    genres: data.genres,
    genreNames: await customGenreNames(data.genres),
    manualCreatorId: data.source === "manual" ? data.created_by : null,
    moderation: {
      status:
        data.moderation_status === "pending" ||
        data.moderation_status === "rejected"
          ? data.moderation_status
          : "approved",
      note: data.moderation_note,
    },
  };
}

/** Para onde foi um livro mesclado com outro (o id que fica), ou null. */
export async function getBookRedirect(id: string): Promise<string | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`book:${id}`);
  if (!UUID.test(id)) return null;
  const { data } = await createPublicClient().rpc("book_redirect", {
    book: id,
  });
  return typeof data === "string" ? data : null;
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
  return (await catalogRows(query, 20)).map(toBookVisual);
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
      "week_adds, total_adds, book:books(id, title, authors, cover_url, cover_color, cover_style, page_count, published_year, moderation_status)",
    )
    .order("week_adds", { ascending: false })
    .order("total_adds", { ascending: false })
    .limit(48);
  if (error) throw error;
  // Livro manual ainda sem revisão não entra nas listas públicas
  const rows = data.flatMap(({ week_adds, total_adds, book }) =>
    book?.moderation_status === "approved"
      ? [{ week: week_adds ?? 0, total: total_adds ?? 0, book }]
      : [],
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

// Cada assunto da Open Library guardado à parte: um gênero novo no filtro não
// refaz os outros. Falha lança erro, para não ficar no cache
async function subjectResults(subject: string): Promise<SearchResult[]> {
  "use cache";
  cacheLife("days");
  cacheTag("explore");
  const results = await openLibrarySubject(subject);
  if (results === null) throw new Error("Open Library indisponível");
  return results;
}

async function trendingResults(): Promise<SearchResult[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("explore");
  const results = await openLibraryTrending();
  if (results === null) throw new Error("Open Library indisponível");
  return results;
}

// Os do MyBooks: os mais adicionados (sem filtro) ou os do gênero, dos que
// estão em mais estantes para os que estão em menos
async function catalogDiscovery(genre: GenreSlug | null) {
  const supabase = createPublicClient();
  if (!genre) {
    const { data, error } = await supabase
      .from("trending_books")
      .select("total_adds, book:books(*)")
      .order("total_adds", { ascending: false })
      .limit(60);
    if (error) throw error;
    return withCommunity(
      data
        .flatMap(({ book }) =>
          book?.moderation_status === "approved" ? [book] : [],
        )
        .slice(0, 48),
    );
  }
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .contains("genres", [genre])
    .eq("moderation_status", "approved")
    .limit(60);
  if (error) throw error;
  const results = await withCommunity(data);
  return results
    .sort((a, b) => (b.shelves ?? 0) - (a.shelves ?? 0))
    .slice(0, 48);
}

/**
 * "Populares e descobertas" do Explorar (MELHORIAS 5.3): os livros mais
 * adicionados no MyBooks, as tendências da semana na Open Library e os
 * assuntos por gênero, sem repetidos (fica a versão do catálogo). De fora,
 * só os que têm capa: a grade é de capas. Uma fonte que falha fica de fora.
 */
export async function getDiscoveryPool(
  genre: GenreSlug | null,
): Promise<SearchResult[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("explore");
  cacheTag("catalog");
  const subjects = genre ? [genre] : MIXED_GENRES;
  const [catalog, trending, ...bySubject] = await Promise.all([
    catalogDiscovery(genre).catch((): SearchResult[] => []),
    genre
      ? Promise.resolve([])
      : trendingResults().catch((): SearchResult[] => []),
    ...subjects.map((slug) =>
      subjectResults(GENRE_SUBJECTS[slug]).catch((): SearchResult[] => []),
    ),
  ]);
  const external = [...trending, ...bySubject.flat()].filter(
    (result) => result.coverUrl,
  );
  return withoutRemoved(dedupeResults([...catalog, ...external]));
}

/** O livro de fora que a grade mostrou, achado de novo no mesmo conjunto (do cache). */
export async function findDiscoveryResult(
  genre: GenreSlug | null,
  sourceId: string,
): Promise<SearchResult | null> {
  const pool = await getDiscoveryPool(genre).catch(() => []);
  return (
    pool.find(
      (result) =>
        !result.catalogId &&
        result.source === "openlibrary" &&
        result.sourceId === sourceId,
    ) ?? null
  );
}
