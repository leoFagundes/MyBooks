import {
  BOOK_LIMITS,
  cleanList,
  cleanText,
  dedupeResults,
  isRecord,
  pickIsbns,
  SOURCE_TIMEOUT_MS,
  type SearchResult,
  toLanguage,
  toPageCount,
  toYear,
} from "./search-result";

const VOLUMES_URL = "https://www.googleapis.com/books/v1/volumes";

function coverFrom(links: unknown) {
  if (!isRecord(links)) return null;
  const url =
    typeof links.thumbnail === "string"
      ? links.thumbnail
      : typeof links.smallThumbnail === "string"
        ? links.smallThumbnail
        : null;
  // https, e sem a dobra de página que o Google desenha na miniatura
  return (
    url?.replace(/^http:\/\//, "https://").replace(/&edge=curl/, "") ?? null
  );
}

/** Um volume do Google Books no formato do MyBooks, ou null. */
export function normalizeGoogleVolume(volume: unknown): SearchResult | null {
  if (!isRecord(volume) || typeof volume.id !== "string" || !volume.id) {
    return null;
  }
  const info = isRecord(volume.volumeInfo) ? volume.volumeInfo : {};
  const title = cleanText(info.title, BOOK_LIMITS.title);
  if (!title) return null;

  const identifiers = Array.isArray(info.industryIdentifiers)
    ? info.industryIdentifiers
    : [];
  const isbns = identifiers.flatMap((id) =>
    isRecord(id) &&
    (id.type === "ISBN_13" || id.type === "ISBN_10") &&
    typeof id.identifier === "string"
      ? [id.identifier]
      : [],
  );

  return {
    source: "google",
    sourceId: volume.id,
    title,
    subtitle: cleanText(info.subtitle, BOOK_LIMITS.subtitle),
    authors: cleanList(info.authors, BOOK_LIMITS.authors, BOOK_LIMITS.author),
    publishedYear: toYear(info.publishedDate),
    pageCount: toPageCount(info.pageCount),
    ...pickIsbns(isbns),
    language: toLanguage([info.language]),
    genres: cleanList(info.categories, BOOK_LIMITS.genres, BOOK_LIMITS.genre),
    coverUrl: coverFrom(info.imageLinks),
  };
}

/**
 * Busca no Google Books (só pelo servidor), a alternativa quando a Open
 * Library falha ou não acha nada. Sem chave de API nem tenta: a cota anônima
 * do Google é zero. Devolve null quando não há resposta útil a tempo.
 */
export async function searchGoogleBooks(
  query: string,
  apiKey: string | undefined,
  fetcher: typeof fetch = fetch,
  timeoutMs = SOURCE_TIMEOUT_MS,
): Promise<SearchResult[] | null> {
  if (!apiKey) return null;
  const url = new URL(VOLUMES_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("printType", "books");
  url.searchParams.set("maxResults", "20");
  url.searchParams.set("key", apiKey);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    const items = isRecord(body) && Array.isArray(body.items) ? body.items : [];
    return dedupeResults(
      items.map(normalizeGoogleVolume).filter((result) => result !== null),
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
