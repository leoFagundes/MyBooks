import type { Route } from "next";
import { CollectionCard } from "@/features/collections/components/collection-card";
import { sampleCollections } from "@/features/collections/sample-collections";

// Na vitrine, as coleções de exemplo abrem a página de demonstração
const toDemoPage = (id: string) => `/dev/colecao/${id}` as Route;

export function CollectionsDemo() {
  return (
    <ul
      aria-label="Coleções de exemplo"
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {sampleCollections.map((collection) => (
        <li key={collection.id}>
          <CollectionCard
            collection={collection}
            href={toDemoPage(collection.id)}
          />
        </li>
      ))}
    </ul>
  );
}
