import { Suspense } from "react";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CollectionsIllustration,
  EmptyShelfIllustration,
  ReadersIllustration,
} from "@/components/ui/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { BookCover } from "@/features/books/components/book-cover";
import { BookLink } from "@/features/books/components/book-link";
import { ReturningCover } from "@/features/books/components/returning-cover";
import { getTrendingBooks } from "@/features/books/queries";
import { CollectionCard } from "@/features/collections/components/collection-card";
import { NewCollectionButton } from "@/features/collections/components/new-collection-button";
import { getPopularCollections } from "@/features/collections/queries";
import { formatNumber } from "@/lib/format";
import { routes } from "@/lib/routes";
import { getAffinityReaders } from "../../queries";
import { ReaderRow } from "../reader-row";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-5">
      <h2 id={id} className="font-serif text-2xl tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * As seções do Explorar sem busca (spec §5.9): coleções populares, livros
 * em alta e, com conta, leitores com afinidade. As duas primeiras são
 * públicas e ficam em cache; a terceira depende de quem vê.
 */
export function ExploreSections() {
  return (
    <div className="flex flex-col gap-14">
      <Section id="colecoes-populares" title="Coleções populares">
        <Suspense fallback={<CardsSkeleton />}>
          <PopularCollections />
        </Suspense>
      </Section>
      <Suspense fallback={<CoversSkeleton />}>
        <TrendingBooks />
      </Suspense>
      <Suspense fallback={null}>
        <AffinityReaders />
      </Suspense>
    </div>
  );
}

export async function PopularCollections({ limit = 6 }: { limit?: number }) {
  const collections = await getPopularCollections(limit);
  if (collections.length === 0) {
    return (
      <EmptyState
        illustration={CollectionsIllustration}
        title="Ainda não há coleções populares"
        description="As coleções públicas mais curtidas aparecem aqui."
        action={<NewCollectionButton variant="outline" />}
      />
    );
  }
  return (
    <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((collection) => (
        <StaggerItem key={collection.id}>
          <CollectionCard
            collection={collection}
            href={routes.collection(collection.id)}
          />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

async function TrendingBooks() {
  const { weekly, books } = await getTrendingBooks(12);
  const title = weekly
    ? "Livros mais adicionados na semana"
    : "Livros mais adicionados";
  return (
    <Section id="livros-em-alta" title={title}>
      {books.length === 0 ? (
        <EmptyState
          illustration={EmptyShelfIllustration}
          title="Ainda não há livros em alta"
          description="Quando as estantes crescerem, os mais adicionados aparecem aqui."
        />
      ) : (
        <Stagger className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
          {books.map((book) => (
            <StaggerItem key={book.id}>
              <BookLink
                book={book}
                href={routes.book(book.id)}
                aria-label={book.title}
                className="block rounded-cover"
              >
                <BookCover book={book} size="fill" />
              </BookLink>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                {weekly
                  ? `${formatNumber(book.adds)} esta semana`
                  : book.adds === 1
                    ? "1 estante"
                    : `${formatNumber(book.adds)} estantes`}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </Section>
  );
}

async function AffinityReaders() {
  const readers = await getAffinityReaders(6);
  if (!readers) return null;
  return (
    <Section
      id="leitores-com-afinidade"
      title="Leitores com afinidade com você"
    >
      {readers.length === 0 ? (
        <EmptyState
          illustration={ReadersIllustration}
          title="Ainda não achamos leitores parecidos"
          description="Ponha mais livros na estante e volte aqui."
        />
      ) : (
        <Stagger className="flex flex-col divide-y divide-border">
          {readers.map((reader) => (
            <StaggerItem key={reader.id}>
              <ReaderRow
                reader={reader}
                state="none"
                detail={`${formatNumber(reader.score)}% de afinidade`}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </Section>
  );
}

function CardsSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Carregando coleções"
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {[0, 1, 2].map((card) => (
        <Skeleton key={card} className="h-64 rounded-card" />
      ))}
    </div>
  );
}

function CoversSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Carregando livros"
      className="flex flex-col gap-5"
    >
      <Skeleton className="h-7 w-72" />
      <div className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((cover) => (
          <Skeleton key={cover} className="aspect-2/3 rounded-cover" />
        ))}
      </div>
      <ReturningCover />
    </div>
  );
}
