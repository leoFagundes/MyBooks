import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { CollectionPageSkeleton } from "@/features/collections/components/collection-page-skeleton";
import {
  sampleCollectionItems,
  sampleCollections,
} from "@/features/collections/sample-collections";
import { CollectionActionsDemo } from "../../_components/collection-actions-demo";
import { CollectionBooksDemo } from "../../_components/collection-books-demo";

export const metadata: Metadata = {
  title: "Coleção de exemplo",
  robots: { index: false },
};

type Params = PageProps<"/dev/colecao/[slug]">["params"];

// Demonstração da página da coleção com as coleções de exemplo. Tem a forma
// da página de verdade: o slug chega dentro do Suspense e os dados vêm de
// leitura em cache. A ordem e as notas mudam só na memória.
export default function DevCollectionPage({ params }: { params: Params }) {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <Suspense fallback={<CollectionPageSkeleton />}>
      <DevCollection params={params} />
    </Suspense>
  );
}

async function DevCollection({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getSampleCollection(slug);
  if (!data) notFound();
  const { collection, items } = data;

  return (
    <PageTransition>
      <main className="mx-auto max-w-5xl px-6 pt-8 pb-32">
        <Link
          href={"/dev#colecoes" as Route}
          className="mb-8 inline-flex items-center gap-1.5 rounded-control text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Voltar para a vitrine
        </Link>
        <div className="mb-12">
          <CollectionActionsDemo collection={collection} />
        </div>
        <CollectionBooksDemo items={items} />
      </main>
    </PageTransition>
  );
}

async function getSampleCollection(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag("dev:colecoes");
  const collection = sampleCollections.find((sample) => sample.id === slug);
  return collection
    ? { collection, items: sampleCollectionItems[slug] ?? [] }
    : null;
}
