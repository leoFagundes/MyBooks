import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { ReturningCover } from "@/features/books/components/returning-cover";
import { getShelfConversations } from "@/features/community/queries";
import { AffinityPicks } from "@/features/home/components/affinity-picks";
import { Conversations } from "@/features/home/components/conversations";
import { Greeting } from "@/features/home/components/greeting";
import { HomeQuote } from "@/features/home/components/home-quote";
import { NextRead } from "@/features/home/components/next-read";
import { getAffinityPicks, getHomeQuotes } from "@/features/home/queries";
import { getProfileCounts } from "@/features/profile/queries";
import { ReadingNow } from "@/features/shelf/components/reading-now";
import { pickRandom } from "@/features/shelf/lib/pick-random";
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

/**
 * Início (spec §5.3): "Lendo agora" (ou a próxima leitura) e o que acontece
 * com quem você segue; ao lado, uma citação, as conversas sobre os seus
 * livros e o que leitores parecidos leram. No celular, uma coluna só, com o
 * feed por último (ele rola sem fim).
 */
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
  const queue = shelf
    .filter((item) => item.status === "want")
    .map((item) => ({ ...item.book, genres: item.genres }));
  const ownedIds = shelf.map((item) => item.book.id);
  const lived = shelf
    .filter((item) => item.status === "read" || item.status === "reading")
    .map((item) => item.book.id);
  // O que vai ao lado não segura a página: sem resposta, o bloco não aparece
  const [conversations, picks, quotes] = await Promise.all([
    getShelfConversations(viewer.id, lived).catch(() => []),
    getAffinityPicks(viewer.id, ownedIds).catch(() => []),
    getHomeQuotes(viewer.id).catch(() => []),
  ]);
  // Uma citação diferente a cada visita: o sorteio é do pedido, não do cache
  await connection();
  const quote = quotes.length > 0 ? pickRandom(quotes) : null;
  const queueAside = reading.length > 0 && queue.length > 0;
  const aside =
    quote !== null ||
    queueAside ||
    conversations.length > 0 ||
    picks.length > 0;

  return (
    <>
      <header className="flex flex-col gap-2">
        <Greeting name={firstName} />
        {shelf.length > 0 ? (
          <Link
            href={routes.profile(viewer.username)}
            className="self-start rounded-sm font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {shelf.length === 1
              ? "1 livro na estante"
              : `${formatNumber(shelf.length)} livros na estante`}
          </Link>
        ) : null}
      </header>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-14">
        <div className="flex min-w-0 flex-col gap-12 lg:col-start-1 lg:row-start-1">
          <ReadingNow entries={reading} />
          {reading.length === 0 ? <NextRead books={queue} /> : null}
        </div>
        {aside ? (
          <aside
            aria-label="Para você"
            className="flex min-w-0 flex-col gap-10 lg:col-start-2 lg:row-span-2 lg:row-start-1"
          >
            {quote ? <HomeQuote quote={quote} viewerId={viewer.id} /> : null}
            {queueAside ? <NextRead books={queue} compact /> : null}
            <Conversations conversations={conversations} />
            <AffinityPicks picks={picks} />
          </aside>
        ) : null}
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
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
              <Feed first={feed} ownedIds={ownedIds} />
            </section>
          ) : (
            <FeedEmpty
              viewerId={viewer.id}
              followsSomeone={(counts?.following ?? 0) > 0}
            />
          )}
        </div>
      </div>
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
