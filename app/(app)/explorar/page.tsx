import type { Metadata } from "next";
import { PageTransition } from "@/components/motion/page-transition";
import { ExploreSearch } from "@/features/social/components/explore/explore-search";
import { ExploreSections } from "@/features/social/components/explore/explore-sections";

export const metadata: Metadata = {
  title: "Explorar",
  description: "Livros, leitores e coleções da comunidade do MyBooks.",
};

// A capa volta da página do livro até aqui só se a página estiver pronta no
// clique: o roteador reaproveita estes dados por 5 minutos
export const unstable_dynamicStaleTime = 300;

/** Explorar (spec §5.9): a busca única e as seções da comunidade. */
export default function ExplorePage() {
  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-2">
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
            Explorar
          </h1>
          <p className="text-pretty text-muted-foreground">
            Livros, leitores e coleções da comunidade.
          </p>
        </header>
        <ExploreSearch>
          <ExploreSections />
        </ExploreSearch>
      </main>
    </PageTransition>
  );
}
