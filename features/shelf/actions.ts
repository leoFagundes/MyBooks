"use server";

import { updateTag } from "next/cache";
import { ensureCatalogBook } from "@/features/books/lib/catalog";
import { findExternalResult } from "@/features/books/queries";
import { type ActionResult, fieldErrorsFrom } from "@/lib/action";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  type AddBookInput,
  addBookSchema,
  type BookRef,
  shelfEntrySchema,
} from "./schemas";

/** O id do livro no catálogo; um livro de fora entra nele agora. */
async function catalogIdFor(
  book: BookRef,
  viewerId: string,
): Promise<ActionResult<string>> {
  if ("catalogId" in book) return { ok: true, data: book.catalogId };
  const result = await findExternalResult(
    book.query,
    book.source,
    book.sourceId,
  );
  if (!result) {
    return {
      ok: false,
      error: "Não achamos esse livro agora. Busque de novo.",
    };
  }
  try {
    const id = await ensureCatalogBook(result, viewerId);
    updateTag("catalog");
    return { ok: true, data: id };
  } catch {
    return {
      ok: false,
      error: "Não deu para trazer esse livro. Tente de novo.",
    };
  }
}

/**
 * O livro escolhido na paleta vai para a estante, com status, nota e data.
 * Já estando lá, fica com o que foi escolhido agora.
 */
export async function addBook(
  input: AddBookInput,
): Promise<ActionResult<{ bookId: string }>> {
  const parsed = addBookSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira a nota e a data.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const viewer = await requireViewer();
  const bookId = await catalogIdFor(parsed.data.book, viewer.id);
  if (!bookId.ok) return bookId;

  const { status, rating, startedAt, finishedAt } = parsed.data.details;
  const supabase = await createClient();
  const { error } = await supabase.from("user_books").upsert(
    {
      user_id: viewer.id,
      book_id: bookId.data,
      status,
      rating,
      started_at: startedAt,
      finished_at: finishedAt,
    },
    { onConflict: "user_id,book_id" },
  );
  if (error) {
    return { ok: false, error: "Não deu para pôr na estante. Tente de novo." };
  }
  updateTag(`shelf:${viewer.id}`);
  return { ok: true, data: { bookId: bookId.data } };
}

export async function removeFromShelf(bookId: string): Promise<ActionResult> {
  const parsed = shelfEntrySchema.shape.bookId.safeParse(bookId);
  if (!parsed.success) return { ok: false, error: "Esse livro não deu certo." };
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_books")
    .delete()
    .eq("user_id", viewer.id)
    .eq("book_id", parsed.data);
  if (error) {
    return {
      ok: false,
      error: "Não deu para tirar da estante. Tente de novo.",
    };
  }
  updateTag(`shelf:${viewer.id}`);
  return { ok: true, data: undefined };
}
