import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { toBookVisual } from "@/features/books/lib/to-book-visual";
import type { BookVisual } from "@/features/books/types";
import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type ShelfItem = {
  book: BookVisual;
  status: Tables<"user_books">["status"];
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
    book ? [{ book: toBookVisual(book), status }] : [],
  );
}
