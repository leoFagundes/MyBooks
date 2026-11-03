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

/** O livro foi tirado do catálogo pela moderação (e não mesclado em outro). */
export class RemovedBookError extends Error {}

type Found = {
  id: string;
  deleted_at: string | null;
  merged_into: string | null;
};

// A obra ou o ISBN acham também o livro excluído (com a chave secreta, sem
// RLS): o mesclado leva ao que ficou; o excluído não volta ao catálogo
function resolve(found: Found): string {
  if (!found.deleted_at) return found.id;
  if (found.merged_into) return found.merged_into;
  throw new RemovedBookError("Livro tirado do catálogo");
}

async function findBook(
  admin: Admin,
  result: SearchResult,
): Promise<string | null> {
  if (result.source !== "manual") {
    const { data, error } = await admin
      .from("books")
      .select("id, deleted_at, merged_into")
      .eq("source", result.source)
      .eq("source_id", result.sourceId)
      .maybeSingle();
    if (error) throw error;
    if (data) return resolve(data);
  }
  if (result.isbn13) {
    const { data, error } = await admin
      .from("books")
      .select("id, deleted_at, merged_into")
      .eq("isbn_13", result.isbn13)
      .maybeSingle();
    if (error) throw error;
    if (data) return resolve(data);
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

/** Os três arquivos de uma pasta de capa (`<id>` ou `<id>/<versão>`). */
const coverPaths = (folder: string) =>
  COVER_FILES.map((file) => `${folder}/${file.name}.webp`);

/**
 * Grava as três larguras na pasta (`<id>`, ou `<id>/<versão>` para a imagem
 * enviada por quem cadastrou); se uma falhar, apaga as outras e devolve false.
 */
export async function storeCover(
  admin: Admin,
  folder: string,
  cover: ProcessedCover,
): Promise<boolean> {
  const uploads = await Promise.all(
    cover.files.map((file) =>
      admin.storage
        .from("covers")
        .upload(`${folder}/${file.name}.webp`, file.data, {
          contentType: "image/webp",
          // O arquivo de uma pasta nunca muda: trocar a imagem é outra pasta
          cacheControl: "31536000",
        }),
    ),
  );
  if (uploads.every((upload) => !upload.error)) return true;
  await removeCover(admin, folder);
  return false;
}

/** Apaga os três arquivos de uma pasta de capa. */
export async function removeCover(admin: Admin, folder: string) {
  await admin.storage.from("covers").remove(coverPaths(folder));
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

  if (stored) await removeCover(admin, id);
  // Outro pedido pôs a mesma obra (ou o mesmo ISBN) primeiro: vale o dele
  if (error.code === "23505") {
    const winner = await findBook(admin, result);
    if (winner) return winner;
  }
  throw error;
}
