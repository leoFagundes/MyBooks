"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { BookCover } from "@/features/books/components/book-cover";
import { BookLink } from "@/features/books/components/book-link";
import { BookOrigin } from "@/features/books/components/book-origin";
import { openExternalBook } from "@/features/books/actions";
import type { SearchResult } from "@/features/books/lib/search-result";
import type { BookRef } from "@/features/shelf/schemas";
import { resultVisual } from "@/features/shelf/components/add-book/chosen-book";
import { actionErrorMessage, unwrapAction } from "@/lib/action";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Classes da grade de capas do Explorar (busca e descobertas). */
export const COVER_GRID =
  "grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6";

/**
 * Um livro na grade do Explorar: a capa, o título e o selo da origem
 * (MELHORIAS 5.2). Do catálogo, leva à página dele (a capa viaja); de fora, o
 * clique o traz para o catálogo e abre a página.
 */
export function ResultCard({
  result,
  outside,
}: {
  result: SearchResult;
  /** Como o servidor acha o livro de fora (a busca ou o conjunto da grade). */
  outside: Exclude<BookRef, { catalogId: string }> | null;
}) {
  const router = useRouter();
  const [opening, startOpening] = useTransition();
  const visual = resultVisual(result);
  const { catalogId } = result;

  function open() {
    if (!outside) return;
    startOpening(async () => {
      const bringing = unwrapAction(openExternalBook(outside));
      toast.promise(bringing, {
        loading: "Trazendo o livro…",
        description: result.title,
        success: () => ({ message: "Pronto", description: result.title }),
        error: (error: unknown) => ({
          message: actionErrorMessage(error),
          description: result.title,
        }),
      });
      const id = await bringing.catch(() => null);
      if (id) router.push(routes.book(id));
    });
  }

  return (
    <div className="flex flex-col">
      {catalogId ? (
        <BookLink
          book={visual}
          href={routes.book(catalogId)}
          aria-label={result.title}
          className="block rounded-cover"
        >
          <BookCover book={visual} size="fill" />
        </BookLink>
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={opening || !outside}
          aria-label={`${result.title}, ainda fora do MyBooks`}
          className={cn(
            "block cursor-pointer rounded-cover text-left transition-opacity disabled:cursor-progress",
            opening && "opacity-60",
          )}
        >
          <BookCover book={visual} size="fill" />
        </button>
      )}
      <p className="mt-2 line-clamp-2 font-serif text-sm leading-tight text-balance">
        {result.title}
      </p>
      {result.authors[0] ? (
        <p className="mt-0.5 line-clamp-2 font-mono text-[11px] text-muted-foreground">
          {result.authors[0]}
        </p>
      ) : null}
      <BookOrigin origin={result} linkCreator className="mt-1.5" />
    </div>
  );
}
