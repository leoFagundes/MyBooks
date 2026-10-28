import type { Metadata } from "next";
import { Suspense } from "react";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { PageTransition } from "@/components/motion/page-transition";
import { EmptyState } from "@/components/ui/empty-state";
import { CollectionsIllustration } from "@/components/ui/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { CollectionCard } from "@/features/collections/components/collection-card";
import { NewCollectionButton } from "@/features/collections/components/new-collection-button";
import { getProfileCollections } from "@/features/collections/queries";
import type { CollectionVisual } from "@/features/collections/types";
import { PrivateProfileNotice } from "@/features/profile/components/private-profile-notice";
import { getProfileFromParam, getProfileTab } from "@/features/profile/queries";
import { routes } from "@/lib/routes";

type Params = PageProps<"/u/[username]/colecoes">["params"];

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const profile = await getProfileFromParam((await params).username);
  return {
    title: profile ? `Coleções de ${profile.displayName}` : "Coleções",
  };
}

const firstName = (name: string) => name.split(/\s+/)[0] || name;

/**
 * Aba Coleções (spec §5.4 e §5.8): as coleções da pessoa (as privadas só
 * para ela e para quem colabora) e, no próprio perfil, as em que ela
 * colabora, as salvas e "Nova coleção".
 */
export default function ProfileCollectionsPage({
  params,
}: PageProps<"/u/[username]/colecoes">) {
  return (
    <Suspense fallback={<CollectionsSkeleton />}>
      <CollectionsTab params={params} />
    </Suspense>
  );
}

async function CollectionsTab({ params }: { params: Params }) {
  const tab = await getProfileTab((await params).username);
  if (!tab) return null;
  const { profile, relation } = tab;
  if (!tab.visible) {
    return <PrivateProfileNotice profile={profile} relation={relation} />;
  }
  const self = relation === "self";
  const { owned, member, saved } = await getProfileCollections(profile);

  return (
    <PageTransition className="flex flex-col gap-12">
      {owned.length === 0 ? (
        <EmptyState
          illustration={CollectionsIllustration}
          title={
            self
              ? "Suas coleções vão morar aqui"
              : `${firstName(profile.displayName)} ainda não tem coleções`
          }
          description={
            self
              ? "Junte livros por tema, por humor ou por quem indicou."
              : "Quando aparecer uma, ela fica aqui."
          }
          action={self ? <NewCollectionButton /> : null}
        />
      ) : (
        <CollectionSection
          title={self ? "Suas coleções" : "Coleções"}
          collections={owned}
          action={self ? <NewCollectionButton variant="outline" /> : null}
        />
      )}
      {member.length > 0 ? (
        <CollectionSection title="Você colabora" collections={member} />
      ) : null}
      {self && saved.length > 0 ? (
        <CollectionSection title="Salvas" collections={saved} />
      ) : null}
    </PageTransition>
  );
}

function CollectionSection({
  title,
  collections,
  action,
}: {
  title: string;
  collections: CollectionVisual[];
  action?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl tracking-tight">{title}</h2>
        {action}
      </div>
      {/* Os cards entram em sequência de 35ms, só na primeira vez */}
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
    </section>
  );
}

function CollectionsSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Carregando as coleções"
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {[0, 1, 2].map((card) => (
        <Skeleton key={card} className="h-72 rounded-card" />
      ))}
    </div>
  );
}
