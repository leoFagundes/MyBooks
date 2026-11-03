import { Suspense } from "react";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CollectionsIllustration,
  ReadersIllustration,
} from "@/components/ui/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { CollectionCard } from "@/features/collections/components/collection-card";
import { NewCollectionButton } from "@/features/collections/components/new-collection-button";
import { getPopularCollections } from "@/features/collections/queries";
import { formatNumber } from "@/lib/format";
import { routes } from "@/lib/routes";
import { getAffinityReaders } from "../../queries";
import { ReaderRow } from "../reader-row";
import { DiscoveryGrid } from "./discovery-grid";

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
 * As seções do Explorar sem busca (spec §5.9 e MELHORIAS 5.3): a grade
 * "Populares e descobertas", as coleções populares e, com conta, leitores
 * com afinidade. As coleções são públicas e ficam em cache; a grade vem do
 * navegador (a ordem é da sessão de quem vê); os leitores dependem de quem vê.
 */
export function ExploreSections() {
  return (
    <div className="flex flex-col gap-14">
      <DiscoveryGrid />
      <Section id="colecoes-populares" title="Coleções populares">
        <Suspense fallback={<CardsSkeleton />}>
          <PopularCollections />
        </Suspense>
      </Section>
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
      role="status"
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
