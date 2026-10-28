import { Skeleton } from "@/components/ui/skeleton";

/** O baralho enquanto a fila (ou o próprio sorteio) chega. */
export function DeckSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <p role="status" className="sr-only">
        Buscando sua fila de leitura…
      </p>
      <Skeleton className="aspect-2/3 w-36 rounded-cover sm:w-44" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}
