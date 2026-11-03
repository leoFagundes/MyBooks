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

/**
 * Identificação que a Open Library pede. Sem um e-mail de contato nela, o
 * limite é de 1 pedido por segundo (e o e-mail nunca é o de quem usa o app).
 */
export const OPEN_LIBRARY_USER_AGENT = "MyBooks/0.1";

const SEARCH_URL = "https://openlibrary.org/search.json";
const FIELDS = [
  "key",
  "title",
  "subtitle",
  "author_name",
  "first_publish_year",
  "number_of_pages_median",
  "isbn",
  "language",
  "subject",
  "cover_i",
].join(",");

// Assuntos que descrevem o acervo da Open Library, e não o livro
const NOT_A_GENRE =
  /^(accessible book|protected daisy|in library|lending library|large type books|overdrive|internet archive wishlist)$/i;

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** Um documento da busca (search.json) no formato do MyBooks, ou null. */
export function normalizeOpenLibraryDoc(doc: unknown): SearchResult | null {
  if (!isRecord(doc)) return null;
  // "/works/OL24141556W" vira "OL24141556W"
  const sourceId =
    typeof doc.key === "string"
      ? doc.key.split("/").filter(Boolean).at(-1)
      : undefined;
  const title = cleanText(doc.title, BOOK_LIMITS.title);
  if (!sourceId || !title) return null;

  const subjects = list(doc.subject).filter(
    (subject) =>
      typeof subject === "string" &&
      !subject.includes(":") &&
      !NOT_A_GENRE.test(subject.trim()),
  );
  const cover = doc.cover_i;

  return {
    source: "openlibrary",
    sourceId,
    title,
    subtitle: cleanText(doc.subtitle, BOOK_LIMITS.subtitle),
    authors: cleanList(
      doc.author_name,
      BOOK_LIMITS.authors,
      BOOK_LIMITS.author,
    ),
    publishedYear: toYear(doc.first_publish_year),
    pageCount: toPageCount(doc.number_of_pages_median),
    ...pickIsbns(list(doc.isbn)),
    language: toLanguage(list(doc.language)),
    genres: cleanList(subjects, BOOK_LIMITS.genres, BOOK_LIMITS.genre),
    coverUrl:
      typeof cover === "number" && Number.isInteger(cover) && cover > 0
        ? `https://covers.openlibrary.org/b/id/${cover}-L.jpg`
        : null,
  };
}

// Um pedido por vez, com pelo menos `ms` entre os inícios
function createThrottle(ms: number) {
  let next = 0;
  return async () => {
    const now = Date.now();
    const slot = Math.max(now, next);
    next = slot + ms;
    if (slot > now)
      await new Promise((resolve) => setTimeout(resolve, slot - now));
  };
}

const waitTurn = createThrottle(1000);

/**
 * Busca na Open Library (só pelo servidor). Devolve os resultados normalizados
 * e sem duplicatas, ou null quando ela falha ou passa de `timeoutMs`, para a
 * busca tentar o Google.
 */
export async function searchOpenLibrary(
  query: string,
  fetcher: typeof fetch = fetch,
  timeoutMs = SOURCE_TIMEOUT_MS,
): Promise<SearchResult[] | null> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("fields", FIELDS);
  url.searchParams.set("limit", "20");
  const body = await fetchJson(url, fetcher, timeoutMs);
  if (body === null) return null;
  return normalizeDocs(isRecord(body) ? list(body.docs) : []);
}

/** Um pedido à Open Library, na vez dele; null quando falha ou demora. */
async function fetchJson(
  url: URL,
  fetcher: typeof fetch,
  timeoutMs: number,
): Promise<unknown> {
  await waitTurn();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      headers: {
        "User-Agent": OPEN_LIBRARY_USER_AGENT,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const normalizeDocs = (docs: unknown[]) =>
  dedupeResults(
    docs.map(normalizeOpenLibraryDoc).filter((result) => result !== null),
  );

/** As obras mais procuradas da semana na Open Library, ou null. */
export async function openLibraryTrending(
  limit = 40,
  fetcher: typeof fetch = fetch,
  timeoutMs = SOURCE_TIMEOUT_MS,
): Promise<SearchResult[] | null> {
  const url = new URL("https://openlibrary.org/trending/weekly.json");
  url.searchParams.set("limit", String(limit));
  const body = await fetchJson(url, fetcher, timeoutMs);
  if (body === null) return null;
  return normalizeDocs(isRecord(body) ? list(body.works) : []);
}

/**
 * As obras de um assunto da Open Library (subjects/<assunto>.json), ou null.
 * O formato é outro (authors com nome, cover_id): vira o da busca.
 */
export async function openLibrarySubject(
  subject: string,
  limit = 30,
  fetcher: typeof fetch = fetch,
  timeoutMs = SOURCE_TIMEOUT_MS,
): Promise<SearchResult[] | null> {
  const url = new URL(
    `https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json`,
  );
  url.searchParams.set("limit", String(limit));
  const body = await fetchJson(url, fetcher, timeoutMs);
  if (body === null) return null;
  const works = isRecord(body) ? list(body.works) : [];
  return normalizeDocs(
    works.map((work) =>
      isRecord(work)
        ? {
            ...work,
            author_name: list(work.authors).map((author) =>
              isRecord(author) ? author.name : null,
            ),
            cover_i: work.cover_id,
          }
        : work,
    ),
  );
}
