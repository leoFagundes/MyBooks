import type { Metadata } from "next";
import { isFeatureOn } from "@/features/admin/queries";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AmbientGlow } from "@/features/books/components/ambient-glow";
import { BookBackLink } from "@/features/books/components/book-back-link";
import { BookHero } from "@/features/books/components/book-hero";
import { BookPageSkeleton } from "@/features/books/components/book-page-skeleton";
import { CommunityBlock } from "@/features/books/components/community-block";
import { EditBookButton } from "@/features/books/components/edit-book-button";
import { bookColor } from "@/features/books/lib/color";
import { AddToCollection } from "@/features/collections/components/add-to-collection";
import { getEditableCollections } from "@/features/collections/queries";
import {
  type BookDetails,
  getBook,
  getBookCommunity,
} from "@/features/books/queries";
import { genreLabel } from "@/features/profile/genres";
import {
  AddToShelfPrompt,
  ShelfEntryBlock,
} from "@/features/shelf/components/shelf-entry-block";
import { getMyBookEntry } from "@/features/shelf/queries";
import { getViewer } from "@/lib/auth";
import { routes } from "@/lib/routes";

type Params = PageProps<"/livro/[id]">["params"];

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const book = await getBook((await params).id);
  if (!book) return { title: "Livro não encontrado" };
  const authors = book.authors.join(", ");
  return {
    title: authors ? `${book.title}, de ${authors}` : book.title,
    description:
      book.description?.slice(0, 200) ??
      `${book.title} no MyBooks: quem leu, resenhas e citações.`,
  };
}

/**
 * Página do livro (spec §5.6): o topo recebe a capa que viaja da estante;
 * embaixo, o seu bloco (status, nota, datas, resenha e citações) e a
 * comunidade. O id só chega no pedido, então tudo mora em Suspense.
 */
export default function BookPage({ params }: PageProps<"/livro/[id]">) {
  return (
    <Suspense fallback={<BookPageSkeleton />}>
      <BookContent params={params} />
    </Suspense>
  );
}

async function BookContent({ params }: { params: Params }) {
  const book = await getBook((await params).id);
  if (!book) notFound();

  return (
    <PageTransition className="relative isolate">
      <AmbientGlow color={bookColor(book)} />
      <main className="mx-auto max-w-5xl px-6 pt-8 pb-32">
        <BookBackLink bookId={book.id} />
        <BookHero
          book={book}
          description={book.description}
          viewer3d={await isFeatureOn("visualizador_3d")}
          actions={
            book.manualCreatorId ? (
              <Suspense fallback={null}>
                <EditBookAction book={book} />
              </Suspense>
            ) : null
          }
        />
        <BookFacts book={book} />
        <div className="mt-14 grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
          <Suspense fallback={<Skeleton className="h-72 rounded-card" />}>
            <ViewerBlock book={book} />
          </Suspense>
          <section aria-labelledby="comunidade" className="flex flex-col gap-6">
            <h2 id="comunidade" className="font-serif text-2xl tracking-tight">
              Comunidade
            </h2>
            <Suspense fallback={<Skeleton className="h-48 rounded-card" />}>
              <Community bookId={book.id} />
            </Suspense>
          </section>
        </div>
      </main>
    </PageTransition>
  );
}

/** Quem cadastrou o livro à mão pode editá-lo (dados e capa). */
async function EditBookAction({ book }: { book: BookDetails }) {
  const viewer = await getViewer();
  if (!viewer || viewer.id !== book.manualCreatorId) return null;
  return <EditBookButton book={book} />;
}

/** Gêneros, ISBN e idioma, em mono e discretos, logo abaixo do topo. */
function BookFacts({ book }: { book: BookDetails }) {
  const genres = book.genres.flatMap((slug) => {
    const label = genreLabel(slug);
    return label ? [label] : [];
  });
  const facts = [
    book.subtitle,
    book.isbn13 ? `ISBN ${book.isbn13}` : null,
    book.language ? book.language.toUpperCase() : null,
  ].filter(Boolean);
  if (genres.length === 0 && facts.length === 0) return null;

  return (
    // Alinhado com o texto do topo: a largura da capa mais o espaço entre eles
    <div className="mt-8 flex flex-col gap-3 sm:ml-64 lg:ml-72">
      {genres.length > 0 ? (
        <ul aria-label="Gêneros" className="flex flex-wrap gap-1.5">
          {genres.map((genre) => (
            <li
              key={genre}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
            >
              {genre}
            </li>
          ))}
        </ul>
      ) : null}
      {facts.length > 0 ? (
        <p className="font-mono text-xs tracking-wide text-muted-foreground">
          {facts.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

async function ViewerBlock({ book }: { book: BookDetails }) {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <section className="flex flex-col items-start gap-3 rounded-card border border-dashed border-border p-5 sm:p-6">
        <h2 className="font-serif text-2xl tracking-tight">Na sua estante?</h2>
        <p className="text-sm text-pretty text-muted-foreground">
          Entre para guardar este livro com status, nota, resenha e citações.
        </p>
        <Button asChild>
          <Link href={routes.entrar}>Entrar</Link>
        </Button>
      </section>
    );
  }
  const [{ entry, quotes }, collections] = await Promise.all([
    getMyBookEntry(viewer.id, book.id),
    getEditableCollections(book.id),
  ]);
  return (
    <div className="flex flex-col gap-6">
      {entry ? (
        <ShelfEntryBlock book={book} entry={entry} quotes={quotes} />
      ) : (
        <AddToShelfPrompt book={book} />
      )}
      <AddToCollection book={book} collections={collections} />
    </div>
  );
}

async function Community({ bookId }: { bookId: string }) {
  return <CommunityBlock community={await getBookCommunity(bookId)} />;
}
