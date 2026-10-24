import { BookCover } from "@/features/books/components/book-cover";
import { Shelf } from "@/features/books/components/shelf";
import { sampleBooks } from "@/features/books/sample-books";
import { DemoRow } from "./dev-section";

const byId = (id: string) => {
  const book = sampleBooks.find((item) => item.id === id);
  if (!book) throw new Error(`livro de exemplo inexistente: ${id}`);
  return book;
};

const highlights = [
  "torto-arado",
  "dom-casmurro",
  "cem-anos-de-solidao",
  "duna",
  "a-paixao-segundo-gh",
  "quarto-de-despejo",
].map(byId);

export function BooksDemo() {
  return (
    <>
      <DemoRow label="Capas · passe o mouse">
        <div className="grid w-full grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {highlights.map((book) => (
            <figure key={book.id} className="flex flex-col gap-2.5">
              <BookCover book={book} size="fill" />
              <figcaption className="flex flex-col gap-0.5">
                <span className="font-serif text-base leading-tight">
                  {book.title}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {book.authors[0]} · {book.publishedYear}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </DemoRow>

      <DemoRow label="Tamanhos">
        <div className="flex flex-wrap items-end gap-5">
          <BookCover book={byId("vidas-secas")} size="sm" />
          <BookCover book={byId("vidas-secas")} size="md" />
          <BookCover book={byId("vidas-secas")} size="lg" />
        </div>
      </DemoRow>

      <DemoRow label="Prateleira · passe o mouse ou use Tab">
        <Shelf books={sampleBooks} className="w-full" />
      </DemoRow>
    </>
  );
}
