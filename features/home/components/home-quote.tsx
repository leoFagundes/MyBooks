import Link from "next/link";
import { routes } from "@/lib/routes";
import type { HomeQuote as Quote } from "../queries";

/**
 * Uma citação da estante (de quem vê ou de quem ela segue), trocando a cada
 * visita: em serifa, discreta, com o livro e quem guardou embaixo.
 */
export function HomeQuote({
  quote,
  viewerId,
}: {
  quote: Quote;
  viewerId: string;
}) {
  const own = quote.reader.id === viewerId;
  return (
    <figure className="flex flex-col gap-3 border-l-2 border-border-strong pl-4">
      <blockquote className="font-serif text-xl leading-snug text-pretty">
        “{quote.text}”
      </blockquote>
      <figcaption className="flex flex-col gap-0.5 text-sm text-muted-foreground">
        <Link
          href={routes.book(quote.book.id)}
          className="line-clamp-2 font-medium text-foreground underline-offset-4 hover:underline"
        >
          {quote.book.title}
        </Link>
        <span className="font-mono text-xs">
          {own ? (
            "Da sua estante"
          ) : (
            <>
              Guardada por{" "}
              <Link
                href={routes.profile(quote.reader.username)}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                @{quote.reader.username}
              </Link>
            </>
          )}
        </span>
      </figcaption>
    </figure>
  );
}
