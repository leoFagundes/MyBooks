import { Skeleton } from "@/components/ui/skeleton";
import { ReturningCover } from "@/features/books/components/returning-cover";

/** A página da coleção enquanto os dados chegam, nas mesmas medidas. */
export function CollectionPageSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Carregando a coleção"
      className="mx-auto max-w-5xl px-6 pt-8 pb-32"
    >
      <ReturningCover />
      <Skeleton className="mb-8 h-5 w-32" />
      <div className="mb-10 flex flex-col gap-3">
        <Skeleton className="h-10 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-full max-w-prose" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="aspect-2/3 w-full rounded-cover" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
