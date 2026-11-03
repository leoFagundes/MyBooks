import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { SuggestionView } from "@/features/suggestions/components/suggestion-view";
import { getSuggestion } from "@/features/suggestions/queries";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Sugestão" };

/** Uma sugestão (MELHORIAS 8.2): voto, resposta oficial e comentários. */
export default function SuggestionPage({
  params,
}: PageProps<"/sugestoes/[id]">) {
  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href={routes.sugestoes}
          className="inline-flex w-fit items-center gap-1.5 rounded-control text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
          Sugestões
        </Link>
        <Suspense fallback={<Skeleton className="h-96 rounded-card" />}>
          <Suggestion params={params} />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function Suggestion({
  params,
}: {
  params: PageProps<"/sugestoes/[id]">["params"];
}) {
  const suggestion = await getSuggestion((await params).id);
  if (!suggestion) notFound();
  return <SuggestionView suggestion={suggestion} />;
}
