"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BookHero, HeroTextSkeleton } from "./book-hero";
import { useTravelingBook } from "./cover-transition";

/**
 * A página do livro enquanto os dados chegam, nas mesmas medidas. Se a pessoa
 * veio da capa ou da lombada deste livro, o topo já traz a capa e o título:
 * o par da viagem só se forma com o destino na tela no mesmo commit do
 * clique, e assim ele não espera o servidor (no dev, sem prefetch, e no
 * primeiro clique, antes de o prefetch chegar).
 */
export function BookPageSkeleton({ param = "id" }: { param?: string }) {
  return (
    <div
      aria-busy
      aria-label="Carregando o livro"
      className="mx-auto max-w-5xl px-6 pt-8 pb-32"
    >
      <Skeleton className="mb-8 h-5 w-24" />
      {/* No pré-render o id ainda não existe e o useParams suspende; na
          navegação ele já está na URL e responde na hora */}
      <Suspense fallback={<HeroSkeleton />}>
        <TravelingHero param={param} />
      </Suspense>
      {/* Gêneros, seu bloco e a comunidade: com a página da mesma altura, a
          barra de rolagem não some e a capa não pula de lado quando ela chega */}
      <div className="mt-8 flex flex-col gap-3 sm:ml-64 lg:ml-72">
        <Skeleton className="h-6 w-48 rounded-full" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="mt-14 grid items-start gap-12 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-card" />
        <div className="flex flex-col gap-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      </div>
    </div>
  );
}

function TravelingHero({ param }: { param: string }) {
  const id = useParams()[param];
  const book = useTravelingBook(typeof id === "string" ? id : null);
  if (!book) return <HeroSkeleton />;
  return <BookHero book={book} description={null} pending />;
}

function HeroSkeleton() {
  return (
    <div className="grid items-start gap-8 sm:grid-cols-[auto_1fr] sm:gap-12">
      {/* A capa e o "Ver em 3D", nas medidas do ViewIn3D */}
      <div className="mx-auto flex w-fit flex-col items-center gap-4 sm:mx-0">
        <Skeleton className="aspect-2/3 w-40 rounded-cover sm:w-52 lg:w-60" />
        <Skeleton className="h-8 w-28 rounded-control" />
      </div>
      <div className="flex flex-col gap-4 sm:pt-6">
        <Skeleton className="h-10 w-3/4" />
        <HeroTextSkeleton />
      </div>
    </div>
  );
}
