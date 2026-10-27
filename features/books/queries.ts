import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { Tables } from "@/lib/supabase/database.types";
import { searchGoogleBooks } from "./lib/google-books";
import { searchOpenLibrary } from "./lib/open-library";
import { normalizeQuery } from "./lib/search-query";
import { dedupeResults, type SearchResult } from "./lib/search-result";
import { toBookVisual } from "./lib/to-book-visual";

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
