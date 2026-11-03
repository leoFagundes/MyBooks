import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { NewTopicButton } from "@/features/community/components/new-topic-button";
import { TopicList } from "@/features/community/components/topic-list";
import { getForumCategories, getTopics } from "@/features/community/queries";
import { TOPIC_SORTS, type TopicSort } from "@/features/community/types";
import { getViewer } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Comunidade",
  description: "Conversas sobre livros, recomendações e clubes de leitura.",
};

const chip =
  "inline-flex h-8 items-center rounded-full border px-3 text-sm transition-colors";

/** O fórum (MELHORIAS 8): categorias, ordem e a lista de tópicos. */
export default function CommunityPage({
  searchParams,
}: PageProps<"/comunidade">) {
  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-2">
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
            Comunidade
          </h1>
          <p className="text-pretty text-muted-foreground">
            Conversas sobre livros, recomendações, clubes de leitura e dúvidas.{" "}
            <Link
              href={routes.sugestoes}
              className="underline underline-offset-4 hover:text-foreground"
            >
              Tem uma ideia para o MyBooks?
            </Link>
          </p>
        </header>
        <Suspense fallback={<ForumSkeleton />}>
          <Forum searchParams={searchParams} />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function Forum({
  searchParams,
}: {
  searchParams: PageProps<"/comunidade">["searchParams"];
}) {
  const params = await searchParams;
  const pick = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : null;
  const sort: TopicSort =
    TOPIC_SORTS.find((item) => item.value === pick(params.ordem))?.value ??
    "recentes";
  const [categories, viewer] = await Promise.all([
    getForumCategories(),
    getViewer(),
  ]);
  const category =
    categories.find((item) => item.slug === pick(params.categoria))?.slug ??
    null;
  const first = await getTopics({ category, sort, page: 0 });
  const href = (next: { categoria?: string | null; ordem?: TopicSort }) => {
    const query: Record<string, string> = {};
    const nextCategory =
      next.categoria === undefined ? category : next.categoria;
    const nextSort = next.ordem ?? sort;
    if (nextCategory) query.categoria = nextCategory;
    if (nextSort !== "recentes") query.ordem = nextSort;
    return { pathname: routes.comunidade, query };
  };
  const newTopic = (
    <NewTopicButton
      signedIn={Boolean(viewer)}
      categories={categories}
      category={category ?? "geral"}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Ordem" className="flex flex-wrap gap-1.5">
          {TOPIC_SORTS.map((item) => (
            <Link
              key={item.value}
              href={href({ ordem: item.value })}
              aria-current={item.value === sort ? "page" : undefined}
              className={cn(
                "rounded-control px-3 py-1.5 text-sm transition-colors",
                item.value === sort
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {newTopic}
      </div>
      <nav aria-label="Categorias">
        <ul className="flex flex-wrap gap-2">
          {[{ slug: null, name: "Todas" }, ...categories].map((item) => {
            const active = item.slug === category;
            return (
              <li key={item.slug ?? "todas"}>
                <Link
                  href={href({ categoria: item.slug })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    chip,
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-surface text-foreground hover:bg-muted",
                  )}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <TopicList
        key={`${category}-${sort}`}
        initial={first}
        category={category}
        sort={sort}
        empty={newTopic}
      />
    </div>
  );
}

function ForumSkeleton() {
  return (
    <div
      role="status"
      aria-busy
      aria-label="Carregando a comunidade"
      className="flex flex-col gap-6"
    >
      <Skeleton className="h-9 w-80" />
      <Skeleton className="h-8 w-full" />
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex gap-4">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
