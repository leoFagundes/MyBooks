import type { Metadata } from "next";
import { AdminPage } from "@/features/admin/components/admin-page";
import { BooksTable } from "@/features/admin/components/books-table";
import { requireStaff } from "@/features/admin/queries";

export const metadata: Metadata = { title: "Livros" };

/** Os livros fora da Open Library e os excluídos pela moderação. */
export default function AdminBooksPage() {
  return (
    <AdminPage
      title="Livros"
      description="Os livros que não vieram da Open Library (cadastrados à mão e do Google Books) e os que a moderação excluiu."
    >
      <Books />
    </AdminPage>
  );
}

async function Books() {
  await requireStaff();
  return <BooksTable />;
}
