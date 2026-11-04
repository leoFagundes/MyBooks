"use client";

import { BookPlus, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/features/books/components/book-cover";
import { BookLink } from "@/features/books/components/book-link";
import { useAddBook } from "@/features/shelf/components/add-book/add-book-provider";
import { useNextRead } from "@/features/shelf/components/next-read/next-read-provider";
import type { DrawBook } from "@/features/shelf/lib/draw-genres";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * "Sua próxima leitura": algumas capas da fila de Quero ler e o sorteio. Sem
 * nada em leitura, aparece grande no topo; lendo algo, discreta, na coluna
 * do lado ("Na fila"). Fila vazia convida a adicionar.
 */
export function NextRead({
  books,
  compact = false,
}: {
  books: DrawBook[];
  compact?: boolean;
}) {
  const nextRead = useNextRead();
  const addBook = useAddBook();
  const shown = books.slice(0, compact ? 3 : 4);
  const title = compact ? "Na fila" : "Sua próxima leitura";

  return (
    <section aria-labelledby="proxima-leitura" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2
          id="proxima-leitura"
          className={cn(
            "font-serif tracking-tight",
            compact ? "text-xl" : "text-2xl",
          )}
        >
          {title}
        </h2>
        {compact ? null : (
          <p className="text-sm text-pretty text-muted-foreground">
            {books.length > 0
              ? "Nada em leitura agora. Que tal começar um da fila?"
              : "Sua fila de Quero ler está vazia. Guarde ali o que quer ler depois."}
          </p>
        )}
      </div>
      {shown.length > 0 ? (
        <ul
          className={cn(
            "grid gap-3",
            compact ? "grid-cols-3" : "grid-cols-4 sm:max-w-md",
          )}
        >
          {shown.map((book) => (
            <li key={book.id}>
              <BookLink
                book={book}
                href={routes.book(book.id)}
                className="block rounded-cover"
              >
                <BookCover book={book} size="fill" />
              </BookLink>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {books.length > 0 ? (
          <Button
            variant={compact ? "outline" : "primary"}
            size={compact ? "sm" : "md"}
            onClick={() => nextRead.open(books)}
          >
            <Shuffle aria-hidden />
            Sortear a próxima
          </Button>
        ) : (
          <Button onClick={() => addBook.open()}>
            <BookPlus aria-hidden />
            Adicionar livro
          </Button>
        )}
      </div>
    </section>
  );
}
