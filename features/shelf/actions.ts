"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { catalogIdFor } from "@/features/books/lib/catalog-ref";
import { type ActionResult, fieldErrorsFrom } from "@/lib/action";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  type AddBookInput,
  addBookSchema,
  type QuoteInput,
  quoteSchema,
  reviewSchema,
  shelfEntrySchema,
  type ShelfEntryUpdate,
  shelfEntryUpdateSchema,
} from "./schemas";

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
  updateTag(`book:${bookId.data}`);
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
  updateTag(`book:${parsed.data}`);
  return { ok: true, data: undefined };
}

const bookIdSchema = z.uuid("Livro inválido");

/**
 * Status, nota, datas e página atual, pelo bloco da página do livro. A UI
 * já mostrou a mudança (useOptimistic); erro volta como mensagem.
 */
export async function updateShelfEntry(
  bookId: string,
  input: ShelfEntryUpdate,
): Promise<ActionResult> {
  const id = bookIdSchema.safeParse(bookId);
  const parsed = shelfEntryUpdateSchema.safeParse(input);
  if (!id.success || !parsed.success) {
    return { ok: false, error: "Confira a nota, as datas e a página." };
  }
  const viewer = await requireViewer();
  const { status, rating, startedAt, finishedAt, currentPage } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_books")
    .update({
      status,
      rating,
      started_at: startedAt,
      finished_at: finishedAt,
      current_page: currentPage,
    })
    .eq("user_id", viewer.id)
    .eq("book_id", id.data);
  if (error) return { ok: false, error: "Não deu para salvar. Tente de novo." };
  updateTag(`shelf:${viewer.id}`);
  updateTag(`book:${id.data}`);
  return { ok: true, data: undefined };
}

/** A resenha, que a página salva sozinha enquanto a pessoa escreve. */
export async function saveReview(
  bookId: string,
  review: string,
): Promise<ActionResult> {
  const id = bookIdSchema.safeParse(bookId);
  const parsed = reviewSchema.safeParse(review);
  if (!id.success || !parsed.success) {
    return {
      ok: false,
      error: parsed.error?.issues[0]?.message ?? "Resenha inválida",
    };
  }
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_books")
    .update({ review: parsed.data })
    .eq("user_id", viewer.id)
    .eq("book_id", id.data);
  if (error) return { ok: false, error: "Não deu para salvar a resenha." };
  updateTag(`shelf:${viewer.id}`);
  updateTag(`book:${id.data}`);
  return { ok: true, data: undefined };
}

export async function addQuote(
  bookId: string,
  input: QuoteInput,
): Promise<ActionResult<{ id: string }>> {
  const id = bookIdSchema.safeParse(bookId);
  const parsed = quoteSchema.safeParse(input);
  if (!id.success || !parsed.success) {
    return {
      ok: false,
      error: parsed.error?.issues[0]?.message ?? "Citação inválida",
      fieldErrors: parsed.error ? fieldErrorsFrom(parsed.error) : undefined,
    };
  }
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .insert({
      user_id: viewer.id,
      book_id: id.data,
      text: parsed.data.text,
      page: parsed.data.page,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Não deu para guardar a citação." };
  updateTag(`shelf:${viewer.id}`);
  return { ok: true, data: { id: data.id } };
}

export async function removeQuote(quoteId: string): Promise<ActionResult> {
  const id = z.uuid().safeParse(quoteId);
  if (!id.success) return { ok: false, error: "Citação inválida" };
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id.data)
    .eq("user_id", viewer.id);
  if (error) return { ok: false, error: "Não deu para apagar a citação." };
  updateTag(`shelf:${viewer.id}`);
  return { ok: true, data: undefined };
}
