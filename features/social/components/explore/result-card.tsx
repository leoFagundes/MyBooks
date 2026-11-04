"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/features/books/components/book-cover";
import { BookLink } from "@/features/books/components/book-link";
import { BookOrigin } from "@/features/books/components/book-origin";
import { openExternalBook } from "@/features/books/actions";
import type { SearchResult } from "@/features/books/lib/search-result";
import type { BookRef } from "@/features/shelf/schemas";
import { useAddBook } from "@/features/shelf/components/add-book/add-book-provider";
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
 * clique o traz para o catálogo e abre a página. Na busca, o de fora ganha o
 * botão explícito "Cadastrar" (`register`).
 */
export function ResultCard({
  result,
  outside,
  register = false,
}: {
  result: SearchResult;
  /** Como o servidor acha o livro de fora (a busca ou o conjunto da grade). */
  outside: Exclude<BookRef, { catalogId: string }> | null;
  /** Mostra "Cadastrar" no livro de fora. */
  register?: boolean;
}) {
  const { enabled: signedIn } = useAddBook();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [opening, startOpening] = useTransition();
  const visual = resultVisual(result);
  const { catalogId } = result;

  function open() {
    if (!outside) return;
    startOpening(async () => {
      const bringing = unwrapAction(openExternalBook(outside));
      toast.promise(bringing, {
        loading: "Cadastrando no MyBooks…",
        description: result.title,
        success: () => ({
          message: "Cadastrado no MyBooks",
          description: result.title,
        }),
        error: (error: unknown) => ({
          message: actionErrorMessage(error),
          description: result.title,
        }),
      });
      const id = await bringing.catch(() => null);
      if (!id) return;
      // As buscas guardadas no navegador ainda o têm como "de fora": refeitas,
      // ele aparece no MyBooks (e não dá para cadastrar de novo)
      void queryClient.invalidateQueries({ queryKey: ["busca-livros"] });
      router.push(routes.book(id));
    });
  }

  return (
    <div className="flex flex-col">
      {catalogId ? (
        <BookLink
          book={visual}
          href={routes.book(catalogId)}
          className="block rounded-cover"
        >
          <BookCover book={visual} size="fill" />
        </BookLink>
      ) : (
        <button
          type="button"
          onClick={open}
          disabled={opening || !outside}
          className={cn(
            "block cursor-pointer rounded-cover text-left transition-opacity disabled:cursor-progress",
            opening && "opacity-60",
          )}
        >
          <BookCover book={visual} size="fill" />
          {/* O nome vem da capa ("Capa de…"); um aria-label próprio não
              conteria o texto visível da capa tipográfica (WCAG 2.5.3) */}
          <span className="sr-only">, ainda fora do MyBooks</span>
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
      {register && outside ? (
        signedIn ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={opening}
            onClick={open}
            aria-label={
              opening ? undefined : `Cadastrar ${result.title} no MyBooks`
            }
            className="mt-2 w-full"
          >
            <Plus aria-hidden className="max-sm:hidden" />
            {opening ? "Cadastrando…" : "Cadastrar"}
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild className="mt-2 w-full">
            {/* Sem conta, o mesmo botão leva a entrar */}
            <Link
              aria-label={`Cadastrar ${result.title} no MyBooks (entrar)`}
              href={{
                pathname: routes.entrar,
                query: {
                  // Volta à mesma busca depois de entrar
                  next:
                    "query" in outside
                      ? `/explorar?q=${encodeURIComponent(outside.query)}`
                      : "/explorar",
                },
              }}
            >
              <Plus aria-hidden className="max-sm:hidden" />
              Cadastrar
            </Link>
          </Button>
        )
      ) : null}
    </div>
  );
}
