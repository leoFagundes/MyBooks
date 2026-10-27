import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { toBookVisual } from "@/features/books/lib/to-book-visual";
import type { BookVisual } from "@/features/books/types";
import { createClient } from "@/lib/supabase/server";
import { SHELF_STATUSES, type ShelfStatus } from "./schemas";

// A coluna é texto com check no banco; o tipo gerado não sabe disso
const isShelfStatus = (value: string): value is ShelfStatus =>
  (SHELF_STATUSES as readonly string[]).includes(value);

export type ShelfItem = {
  book: BookVisual;
  status: ShelfStatus;
};

/**
 * A estante de alguém, do livro mexido por último ao primeiro. Lê com a
 * sessão de quem está vendo: a RLS decide se a estante de perfil privado
 * aparece. O cache privado fica no navegador de quem vê; quem muda a estante
 * chama updateTag("shelf:<userId>").
 */
export async function getShelf(userId: string): Promise<ShelfItem[]> {
  "use cache: private";
  cacheLife("minutes");
  cacheTag(`shelf:${userId}`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_books")
    .select(
      "status, book:books(id, title, authors, cover_url, cover_color, page_count, published_year)",
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data.flatMap(({ status, book }) =>
    book && isShelfStatus(status) ? [{ book: toBookVisual(book), status }] : [],
  );
}

export type QuoteItem = {
  id: string;
  text: string;
  page: number | null;
  book: BookVisual;
};

/**
 * As citações de alguém, da mais nova à mais antiga. Mesma regra da estante:
 * a RLS esconde as de perfil privado de quem não segue.
 */
export async function getQuotes(userId: string): Promise<QuoteItem[]> {
  "use cache: private";
  cacheLife("minutes");
  cacheTag(`shelf:${userId}`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(
      "id, text, page, book:books(id, title, authors, cover_url, cover_color, page_count, published_year)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.flatMap(({ id, text, page, book }) =>
    book ? [{ id, text, page, book: toBookVisual(book) }] : [],
  );
}
