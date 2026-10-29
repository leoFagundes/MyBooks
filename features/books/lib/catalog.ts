import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { COVER_FILES, OPEN_LIBRARY_COVER_URL } from "./cover";
import { processCover, type ProcessedCover } from "./cover-pipeline";
import { toGenreSlugs } from "./genre-map";
import { OPEN_LIBRARY_USER_AGENT } from "./open-library";
import { SOURCE_TIMEOUT_MS, type SearchResult } from "./search-result";

type Admin = ReturnType<typeof createAdminClient>;

// Só capas das fontes: a URL vem da busca, mas o servidor não baixa qualquer
// endereço
const COVER_HOSTS = new Set([
  "covers.openlibrary.org",
  "books.google.com",
  "books.googleusercontent.com",
]);
const MAX_COVER_BYTES = 8 * 1024 * 1024;

async function findBook(
  admin: Admin,
  result: SearchResult,
): Promise<string | null> {
  if (result.source !== "manual") {
    const { data, error } = await admin
      .from("books")
      .select("id")
      .eq("source", result.source)
      .eq("source_id", result.sourceId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data.id;
  }
  if (result.isbn13) {
    const { data, error } = await admin
      .from("books")
      .select("id")
      .eq("isbn_13", result.isbn13)
      .maybeSingle();
    if (error) throw error;
    if (data) return data.id;
  }
  return null;
}

async function downloadCover(
  url: string,
  fetcher: typeof fetch,
): Promise<Buffer | null> {
  let address: URL;
  try {
    address = new URL(url);
  } catch {
    return null;
  }
  if (address.protocol !== "https:" || !COVER_HOSTS.has(address.hostname)) {
    return null;
  }
  // Sem capa, a Open Library responde 404 em vez de um GIF de 1px
  if (address.hostname === "covers.openlibrary.org") {
    address.searchParams.set("default", "false");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    const response = await fetcher(address, {
      headers: { "User-Agent": OPEN_LIBRARY_USER_AGENT },
      signal: controller.signal,
    });
    const type = response.headers.get("Content-Type") ?? "";
    const length = Number(response.headers.get("Content-Length") ?? 0);
    if (!response.ok || !type.startsWith("image/") || length > MAX_COVER_BYTES)
      return null;
    const image = Buffer.from(await response.arrayBuffer());
    return image.byteLength > 0 && image.byteLength <= MAX_COVER_BYTES
      ? image
      : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const coverPaths = (bookId: string) =>
  COVER_FILES.map((file) => `${bookId}/${file.name}.webp`);

/** Grava as três larguras; se uma falhar, apaga as outras e devolve false. */
async function storeCover(
  admin: Admin,
  bookId: string,
  cover: ProcessedCover,
): Promise<boolean> {
  const uploads = await Promise.all(
    cover.files.map((file) =>
      admin.storage
        .from("covers")
        .upload(`${bookId}/${file.name}.webp`, file.data, {
          contentType: "image/webp",
          // O arquivo de um livro nunca muda
          cacheControl: "31536000",
        }),
    ),
  );
  if (uploads.every((upload) => !upload.error)) return true;
  await admin.storage.from("covers").remove(coverPaths(bookId));
  return false;
}

/**
 * Traz para o bucket a capa de um livro que ainda aponta para a Open Library
 * (os do seed): lá, cada capa passa por três redirecionamentos e chega
 * segundos depois, atrasando o LCP. Grava as três larguras em covers/<id>/;
 * quem chama troca o cover_url.
 */
export async function copyCoverToBucket(
  bookId: string,
  url: string,
  { fetcher = fetch }: { fetcher?: typeof fetch } = {},
): Promise<boolean> {
  const image = await downloadCover(url, fetcher);
  const cover = image ? await processCover(image) : null;
  return cover ? storeCover(createAdminClient(), bookId, cover) : false;
}

/**
 * O id do livro no catálogo. Acha pela obra na fonte ou pelo ISBN-13; se não
 * achar, baixa a capa uma vez, tira a cor, grava as três larguras em
 * covers/<id>/ e insere o livro em nome de quem o trouxe.
 *
 * O resultado precisa vir da busca do servidor, nunca do cliente: a escrita
 * é com a chave secreta.
 */
export async function ensureCatalogBook(
  result: SearchResult,
  viewerId: string,
  { fetcher = fetch }: { fetcher?: typeof fetch } = {},
): Promise<string> {
  if (result.catalogId) return result.catalogId;
  if (result.source === "manual") {
    throw new Error("Livro manual chega ao catálogo pelo cadastro manual");
  }
  const admin = createAdminClient();
  const existing = await findBook(admin, result);
  if (existing) return existing;

  const id = randomUUID();
  const image = result.coverUrl
    ? await downloadCover(result.coverUrl, fetcher)
    : null;
  const cover = image ? await processCover(image) : null;
  const stored = cover ? await storeCover(admin, id, cover) : false;
  // Sem a cópia no bucket, a da Open Library ainda serve (a do Google, não:
  // o banco só aceita capas da Open Library ou do bucket)
  const fallback =
    result.coverUrl && OPEN_LIBRARY_COVER_URL.test(result.coverUrl)
      ? result.coverUrl
      : null;

  const { error } = await admin.from("books").insert({
    id,
    title: result.title,
    subtitle: result.subtitle,
    authors: result.authors,
    page_count: result.pageCount,
    published_year: result.publishedYear,
    isbn_13: result.isbn13,
    isbn_10: result.isbn10,
    language: result.language,
    genres: toGenreSlugs(result.genres),
    cover_url: stored ? `covers/${id}` : fallback,
    cover_color: cover?.color ?? null,
    source: result.source,
    source_id: result.sourceId,
    created_by: viewerId,
  });
  if (!error) return id;

  if (stored) await admin.storage.from("covers").remove(coverPaths(id));
  // Outro pedido pôs a mesma obra (ou o mesmo ISBN) primeiro: vale o dele
  if (error.code === "23505") {
    const winner = await findBook(admin, result);
    if (winner) return winner;
  }
  throw error;
}
