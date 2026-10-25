"use server";

import { updateTag } from "next/cache";
import type { ActionResult } from "@/lib/action";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { type ShelfStatus, shelfEntrySchema } from "./schemas";

/** Põe o livro do catálogo na estante, ou muda o status se ele já está lá. */
export async function addToShelf(
  bookId: string,
  status: ShelfStatus,
): Promise<ActionResult> {
  const parsed = shelfEntrySchema.safeParse({ bookId, status });
  if (!parsed.success) return { ok: false, error: "Esse livro não deu certo." };
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.from("user_books").upsert(
    {
      user_id: viewer.id,
      book_id: parsed.data.bookId,
      status: parsed.data.status,
    },
    { onConflict: "user_id,book_id" },
  );
  if (error) {
    return { ok: false, error: "Não deu para pôr na estante. Tente de novo." };
  }
  updateTag(`shelf:${viewer.id}`);
  return { ok: true, data: undefined };
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
