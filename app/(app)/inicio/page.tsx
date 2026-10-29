import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { ReturningCover } from "@/features/books/components/returning-cover";
import { getProfileCounts } from "@/features/profile/queries";
import { ReadingNow } from "@/features/shelf/components/reading-now";
import { getShelf } from "@/features/shelf/queries";
import { Feed } from "@/features/social/components/feed/feed";
import { FeedEmpty } from "@/features/social/components/feed/feed-empty";
import { getFeedFirstPage } from "@/features/social/queries";
import { requireViewer } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Início" };

// A capa volta da página do livro até a estante só se ela estiver pronta no
// clique: o roteador reaproveita estes dados por 5 minutos (ver o perfil)
export const unstable_dynamicStaleTime = 300;

/** Início (spec §5.3): "Lendo agora" e o que acontece com quem você segue. */
export default function HomePage() {
  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6 sm:py-14">
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
  const [shelf, feed, counts] = await Promise.all([
    getShelf(viewer.id),
    getFeedFirstPage(viewer.id),
    getProfileCounts(viewer),
  ]);
  const firstName = viewer.displayName.split(/\s+/)[0] || viewer.displayName;
  const reading = shelf.filter((item) => item.status === "reading");

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
      <ReadingNow entries={reading} />
      {feed.groups.length > 0 ? (
        <section
          aria-labelledby="quem-voce-segue"
          className="flex max-w-2xl flex-col gap-6"
        >
          <h2
            id="quem-voce-segue"
            className="font-serif text-2xl tracking-tight"
          >
            Quem você segue
          </h2>
          <Feed first={feed} ownedIds={shelf.map((item) => item.book.id)} />
        </section>
      ) : (
        <FeedEmpty
          viewerId={viewer.id}
          followsSomeone={(counts?.following ?? 0) > 0}
        />
      )}
    </>
  );
}

function HomeSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Carregando o início"
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="h-11 w-48" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-36" />
        <div className="flex gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="aspect-2/3 w-24 rounded-cover sm:w-28"
            />
          ))}
        </div>
      </div>
      <ReturningCover />
    </div>
  );
}
