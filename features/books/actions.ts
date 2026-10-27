"use server";

import { updateTag } from "next/cache";
import { type ActionResult, fieldErrorsFrom } from "@/lib/action";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toBookVisual } from "./lib/to-book-visual";
import { type ManualBookFields, manualBookSchema } from "./schemas";
import type { BookVisual } from "./types";

const VISUAL_COLUMNS =
  "id, title, authors, cover_url, cover_color, page_count, published_year";

/**
 * Livro cadastrado à mão entra no catálogo em nome de quem cadastrou (a RLS só
 * deixa livro manual). Se o ISBN já está no catálogo, vale o livro de lá.
 */
export async function createManualBook(
  fields: ManualBookFields,
): Promise<ActionResult<BookVisual>> {
  const parsed = manualBookSchema.safeParse(fields);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const viewer = await requireViewer();
  const supabase = await createClient();
  const book = parsed.data;
  const { data, error } = await supabase
    .from("books")
    .insert({
      title: book.title,
      subtitle: book.subtitle,
      authors: book.authors,
      published_year: book.publishedYear,
      page_count: book.pageCount,
      isbn_13: book.isbn13,
      isbn_10: book.isbn10,
      source: "manual",
      created_by: viewer.id,
    })
    .select(VISUAL_COLUMNS)
    .single();

  if (error) {
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
