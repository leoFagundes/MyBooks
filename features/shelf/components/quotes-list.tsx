import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { BookCover } from "@/features/books/components/book-cover";
import { BookLink } from "@/features/books/components/book-link";
import { formatNumber } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { QuoteItem } from "../queries";
import { ShareQuoteButton } from "./share-quote-button";

/** As citações de alguém, cada uma com o livro e a página. */
export function QuotesList({ quotes }: { quotes: QuoteItem[] }) {
  return (
    <Stagger className="flex flex-col gap-4">
      {quotes.map((quote) => (
        <StaggerItem key={quote.id}>
          <figure className="flex gap-4 rounded-card border border-border p-5 sm:gap-5 sm:p-6">
            <div className="shrink-0 self-start">
              <BookCover book={quote.book} size="xs" tilt={false} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <blockquote className="font-serif text-xl leading-snug text-pretty sm:text-2xl">
                “{quote.text}”
              </blockquote>
              <figcaption className="font-mono text-xs text-muted-foreground">
                <BookLink
                  book={quote.book}
                  href={routes.book(quote.book.id)}
                  className="rounded-control text-foreground underline-offset-4 hover:underline"
                >
                  {quote.book.title}
                </BookLink>
                {quote.book.authors.length > 0
                  ? ` · ${quote.book.authors.join(", ")}`
                  : ""}
                {quote.page !== null ? ` · p. ${formatNumber(quote.page)}` : ""}
              </figcaption>
            </div>
            <ShareQuoteButton
              quoteId={quote.id}
              bookTitle={quote.book.title}
              className="-mt-1 -mr-2 self-start"
            />
          </figure>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
