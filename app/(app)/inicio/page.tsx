import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { MyShelf } from "@/features/shelf/components/my-shelf";
import { getShelf } from "@/features/shelf/queries";
import { requireViewer } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Início" };

// A capa volta da página do livro até a estante só se ela estiver pronta no
// clique: o roteador reaproveita estes dados por 5 minutos (ver o perfil)
export const unstable_dynamicStaleTime = 300;

// Provisório: o feed e o "Lendo agora" chegam na Fase 5
export default function HomePage() {
  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <Suspense fallback={<HomeSkeleton />}>
          <Home />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function Home() {
  const viewer = await requireViewer();
  if (!viewer.onboarded) redirect(routes.onboarding);
  const shelf = await getShelf(viewer.id);
  const firstName = viewer.displayName.split(/\s+/)[0] || viewer.displayName;

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
          Oi, {firstName}.
        </h1>
        {shelf.length > 0 ? (
          <p className="font-mono text-xs text-muted-foreground">
            {shelf.length === 1
              ? "1 livro na estante"
              : `${formatNumber(shelf.length)} livros na estante`}
          </p>
        ) : null}
      </header>
      <MyShelf books={shelf.map((item) => item.book)} />
    </>
  );
}

function HomeSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Carregando sua estante"
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="h-11 w-48" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-9 w-64" />
      <div className="flex items-end gap-1.5">
        {[176, 160, 184, 168, 152, 180, 164].map((height, i) => (
          <Skeleton key={i} className="w-8 rounded-cover" style={{ height }} />
        ))}
      </div>
    </div>
  );
}
