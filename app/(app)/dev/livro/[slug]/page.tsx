import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { AmbientGlow } from "@/features/books/components/ambient-glow";
import { BookHero } from "@/features/books/components/book-hero";
import { BookPageSkeleton } from "@/features/books/components/book-page-skeleton";
import { bookColor } from "@/features/books/lib/color";
import { sampleBooks, sampleDescriptions } from "@/features/books/sample-books";

export const metadata: Metadata = {
  title: "Livro de exemplo",
  robots: { index: false },
};

type Params = PageProps<"/dev/livro/[slug]">["params"];

// Demonstração da página do livro com os livros de exemplo. Tem a forma da
// página de verdade: o slug só chega na hora do pedido (dentro do Suspense)
// e o livro vem de leitura em cache, que o prefetch do BookLink resolve antes
// do clique para a capa viajar.
export default function DevBookPage({ params }: { params: Params }) {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <Suspense fallback={<BookPageSkeleton />}>
      <DevBook params={params} />
    </Suspense>
  );
}

async function DevBook({ params }: { params: Params }) {
  const { slug } = await params;
  const book = await getSampleBook(slug);
  if (!book) notFound();

  return (
    <PageTransition className="relative isolate">
      <AmbientGlow color={bookColor(book)} />
      <main className="mx-auto max-w-5xl px-6 pt-8 pb-32">
        <Link
          href={"/dev#visualizacoes" as Route}
          className="mb-8 inline-flex items-center gap-1.5 rounded-control text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar para a vitrine
        </Link>
        <BookHero
          book={book}
          description={sampleDescriptions[book.id] ?? null}
        />
      </main>
    </PageTransition>
  );
}

async function getSampleBook(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag("dev:livros");
  return sampleBooks.find((book) => book.id === slug) ?? null;
}
