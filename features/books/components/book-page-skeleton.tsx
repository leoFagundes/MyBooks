import { Skeleton } from "@/components/ui/skeleton";

/** O topo da página do livro enquanto os dados chegam, nas mesmas medidas. */
export function BookPageSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Carregando o livro"
      className="mx-auto max-w-5xl px-6 pt-8 pb-32"
    >
      <Skeleton className="mb-8 h-4 w-24" />
      <div className="grid items-start gap-8 sm:grid-cols-[auto_1fr] sm:gap-12">
        <Skeleton className="mx-auto aspect-2/3 w-40 rounded-cover sm:mx-0 sm:w-52 lg:w-60" />
        <div className="flex flex-col gap-4 sm:pt-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
          <div className="flex flex-col gap-2 pt-2">
            <Skeleton className="h-4 w-full max-w-prose" />
            <Skeleton className="h-4 w-full max-w-prose" />
            <Skeleton className="h-4 w-2/3 max-w-prose" />
          </div>
        </div>
      </div>
    </div>
  );
}
