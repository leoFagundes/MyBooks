import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { CollectionPageSkeleton } from "@/features/collections/components/collection-page-skeleton";
import { CollectionView } from "@/features/collections/components/collection-view";
import { getCollection } from "@/features/collections/queries";

type Params = PageProps<"/colecao/[id]">["params"];

// A grade é origem da viagem da capa: a volta da página do livro só anima
// com a coleção pronta no clique (ver a aba Estante do perfil)
export const unstable_dynamicStaleTime = 300;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const page = await getCollection((await params).id);
  if (!page) return { title: "Coleção não encontrada" };
  const { collection } = page;
  return {
    title: collection.emoji
      ? `${collection.emoji} ${collection.title}`
      : collection.title,
    description:
      collection.description ??
      `${collection.title}, uma coleção de @${collection.owner.username} no MyBooks.`,
    robots: collection.visibility === "private" ? { index: false } : undefined,
  };
}

/**
 * Página da coleção (spec §5.8): cabeçalho e livros em grade. O id só chega
 * no pedido, e quem vê decide o que aparece (a RLS esconde a privada de quem
 * não é membro), então tudo mora em Suspense.
 */
export default function CollectionPage({ params }: PageProps<"/colecao/[id]">) {
  return (
    <Suspense fallback={<CollectionPageSkeleton />}>
      <CollectionContent params={params} />
    </Suspense>
  );
}

async function CollectionContent({ params }: { params: Params }) {
  const page = await getCollection((await params).id);
  if (!page) notFound();

  return (
    <PageTransition>
      <main className="mx-auto max-w-5xl px-6 pt-8 pb-32">
        <CollectionView page={page} />
      </main>
    </PageTransition>
  );
}
