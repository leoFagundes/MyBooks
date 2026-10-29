"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { type ActionResult, fieldErrorsFrom } from "@/lib/action";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  removeUploadedCover,
  storeUploadedCover,
  type UploadedCover,
} from "./lib/cover-upload";
import { toBookVisual } from "./lib/to-book-visual";
import {
  type CoverDesign,
  coverDesignSchema,
  type ManualBook,
  type ManualBookFields,
  manualBookSchema,
} from "./schemas";
import type { BookVisual } from "./types";

const VISUAL_COLUMNS =
  "id, title, authors, cover_url, cover_color, cover_style, page_count, published_year";

type Parsed =
  | { ok: true; book: ManualBook; design: CoverDesign }
  | { ok: false; result: ActionResult<never> };

function parseBook(fields: ManualBookFields, design: CoverDesign): Parsed {
  const book = manualBookSchema.safeParse(fields);
  if (!book.success) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "Confira os campos.",
        fieldErrors: fieldErrorsFrom(book.error),
      },
    };
  }
  const cover = coverDesignSchema.safeParse(design);
  if (!cover.success) {
    return { ok: false, result: { ok: false, error: "Confira a capa." } };
  }
  return { ok: true, book: book.data, design: cover.data };
}

const IMAGE_FAILED: ActionResult<never> = {
  ok: false,
  error: "Não deu para usar essa imagem. Tente outra, em JPG, PNG ou WebP.",
};

const ISBN_TAKEN: ActionResult<never> = {
  ok: false,
  error: "Confira os campos.",
  fieldErrors: { isbn: "Esse ISBN já é de outro livro do catálogo" },
};

/** As colunas que a pessoa escreve: dados do livro e a capa tipográfica. */
function bookColumns(book: ManualBook, design: CoverDesign) {
  return {
    title: book.title,
    subtitle: book.subtitle,
    authors: book.authors,
    published_year: book.publishedYear,
    page_count: book.pageCount,
    isbn_13: book.isbn13,
    isbn_10: book.isbn10,
    cover_color: design.color,
    // A Clássica é o padrão: fica null no banco
    cover_style: design.style === "classic" ? null : design.style,
  };
}

/**
 * Livro cadastrado à mão entra no catálogo em nome de quem cadastrou (a RLS só
 * deixa livro manual), com a cor e o estilo da capa tipográfica e, se veio, a
 * imagem da capa (o servidor a refaz em três larguras e tira a cor dela). Se
 * o ISBN já está no catálogo, vale o livro de lá.
 */
export async function createManualBook(
  fields: ManualBookFields,
  design: CoverDesign,
  image: Blob | null,
): Promise<ActionResult<BookVisual>> {
  const parsed = parseBook(fields, design);
  if (!parsed.ok) return parsed.result;
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { book } = parsed;

  // A imagem sobe antes do livro: se ela não servir, nada é criado
  const id = randomUUID();
  let cover: UploadedCover | null = null;
  if (image) {
    cover = await storeUploadedCover(id, image);
    if (!cover) return IMAGE_FAILED;
  }

  const { data, error } = await supabase
    .from("books")
    .insert({
      id,
      ...bookColumns(book, parsed.design),
      ...(cover ? { cover_url: cover.coverUrl, cover_color: cover.color } : {}),
      source: "manual",
      created_by: viewer.id,
    })
    .select(VISUAL_COLUMNS)
    .single();

  if (error) {
    if (cover) await removeUploadedCover(id, cover.coverUrl);
    if (error.code === "23505" && book.isbn13) {
      const { data: existing } = await supabase
        .from("books")
        .select(VISUAL_COLUMNS)
        .eq("isbn_13", book.isbn13)
        .maybeSingle();
      if (existing) return { ok: true, data: toBookVisual(existing) };
    }
    return {
      ok: false,
      error: "Não deu para cadastrar o livro. Tente de novo.",
    };
  }
  updateTag("catalog");
  return { ok: true, data: toBookVisual(data) };
}

/**
 * Atualiza as listas em cache que mostram o livro: a página dele, a busca, a
 * estante de quem editou e as coleções em que ele está. As estantes dos
 * outros têm cache no navegador de cada um, que expira em minutos.
 */
async function refreshBookEverywhere(bookId: string, viewerId: string) {
  updateTag(`book:${bookId}`);
  updateTag("catalog");
  updateTag(`shelf:${viewerId}`);
  const { data } = await createAdminClient()
    .from("collection_items")
    .select("collection_id")
    .eq("book_id", bookId);
  for (const { collection_id } of data ?? []) {
    updateTag(`collection:${collection_id}`);
  }
}

/**
 * Quem cadastrou um livro à mão pode corrigi-lo: dados, cor e estilo da capa
 * e a imagem (trocar ou tirar). Os dados passam pela RLS ("creators edit
 * their manual books"); a imagem, só o servidor grava.
 */
export async function updateManualBook(
  bookId: string,
  fields: ManualBookFields,
  design: CoverDesign,
  image: Blob | null,
  removeImage: boolean,
): Promise<ActionResult<BookVisual>> {
  const parsed = parseBook(fields, design);
  if (!parsed.ok) return parsed.result;
  const viewer = await requireViewer();
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("books")
    .select("id, source, created_by, cover_url, cover_color")
    .eq("id", bookId)
    .maybeSingle();
  if (
    !current ||
    current.source !== "manual" ||
    current.created_by !== viewer.id
  ) {
    return { ok: false, error: "Só quem cadastrou o livro pode editá-lo." };
  }

  let cover: UploadedCover | null = null;
  if (image) {
    cover = await storeUploadedCover(bookId, image);
    if (!cover) return IMAGE_FAILED;
  }
  const keepsImage = !cover && !removeImage && current.cover_url !== null;
  const columns = bookColumns(parsed.book, parsed.design);
  // Com imagem, a cor do livro é a dela (lombada e fundo da capa)
  if (keepsImage) columns.cover_color = current.cover_color;

  const { data: updated, error } = await supabase
    .from("books")
    .update(columns)
    .eq("id", bookId)
    .select("id")
    .maybeSingle();
  if (error || !updated) {
    if (cover) await removeUploadedCover(bookId, cover.coverUrl);
    return error?.code === "23505"
      ? ISBN_TAKEN
      : { ok: false, error: "Não deu para salvar o livro. Tente de novo." };
  }

  // A imagem (cover_url) só o servidor grava, e só depois de ela estar no bucket
  if (cover || (removeImage && current.cover_url)) {
    const { error: imageError } = await createAdminClient()
      .from("books")
      .update(
        cover
          ? { cover_url: cover.coverUrl, cover_color: cover.color }
          : { cover_url: null },
      )
      .eq("id", bookId);
    if (imageError) {
      if (cover) await removeUploadedCover(bookId, cover.coverUrl);
      return { ok: false, error: "Não deu para trocar a imagem da capa." };
    }
    if (current.cover_url) {
      await removeUploadedCover(bookId, current.cover_url);
    }
  }

  await refreshBookEverywhere(bookId, viewer.id);
  const { data: saved } = await supabase
    .from("books")
    .select(VISUAL_COLUMNS)
    .eq("id", bookId)
    .single();
  return saved
    ? { ok: true, data: toBookVisual(saved) }
    : { ok: false, error: "Não deu para salvar o livro. Tente de novo." };
}
