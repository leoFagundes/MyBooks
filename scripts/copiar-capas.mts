// Copia para o bucket covers as capas do catálogo que ainda apontam para a
// Open Library (os livros do seed) e troca o cover_url para covers/<id>.
// Lá, cada capa passa por três redirecionamentos e atrasa o LCP; no bucket,
// sai de um lugar só, em WebP, com cache de um ano.
//
//   npm run capas:copiar
//
// Roda depois do seed (ou de novo, a qualquer hora: só mexe no que falta).
// Uma capa por vez, para não encher a Open Library de pedidos.
import { copyCoverToBucket } from "@/features/books/lib/catalog";
import { OPEN_LIBRARY_COVER_URL } from "@/features/books/lib/cover";
import { createAdminClient } from "@/lib/supabase/admin";

const admin = createAdminClient();
const { data: books, error } = await admin
  .from("books")
  .select("id, title, cover_url")
  .like("cover_url", "https://covers.openlibrary.org/%");
if (error) throw error;

let copied = 0;
const failed: string[] = [];
for (const book of books ?? []) {
  if (!book.cover_url || !OPEN_LIBRARY_COVER_URL.test(book.cover_url)) continue;
  const stored = await copyCoverToBucket(book.id, book.cover_url);
  if (!stored) {
    failed.push(book.title);
    continue;
  }
  const { error: update } = await admin
    .from("books")
    .update({ cover_url: `covers/${book.id}` })
    .eq("id", book.id);
  if (update) failed.push(book.title);
  else copied += 1;
}

console.log(
  `Capas copiadas para o bucket: ${copied} de ${books?.length ?? 0}.`,
);
if (failed.length > 0) {
  console.log(`Ficaram na Open Library: ${failed.join(", ")}.`);
}
