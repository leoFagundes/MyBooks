import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { TopicView } from "@/features/community/components/topic-view";
import {
  getForumCategories,
  getTopic,
  getTopicTitle,
} from "@/features/community/queries";
import { routes } from "@/lib/routes";

type Params = PageProps<"/comunidade/[id]">["params"];

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const title = await getTopicTitle((await params).id);
  return { title: title ?? "Tópico" };
}

/** Um tópico do fórum (MELHORIAS 8), com as respostas. */
export default function TopicPage({ params }: PageProps<"/comunidade/[id]">) {
  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href={routes.comunidade}
          className="inline-flex w-fit items-center gap-1.5 rounded-control text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
          Comunidade
        </Link>
        <Suspense fallback={<TopicSkeleton />}>
          <Topic params={params} />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function Topic({ params }: { params: Params }) {
  const [topic, categories] = await Promise.all([
    getTopic((await params).id),
    getForumCategories(),
  ]);
  if (!topic) notFound();
  return <TopicView topic={topic} categories={categories} />;
}

function TopicSkeleton() {
  return (
    <div
      role="status"
      aria-busy
      aria-label="Carregando o tópico"
      className="flex flex-col gap-5"
    >
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
