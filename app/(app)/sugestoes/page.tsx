import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageTransition } from "@/components/motion/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import {
  NewSuggestionButton,
  SuggestionList,
} from "@/features/suggestions/components/suggestion-list";
import { getSuggestions } from "@/features/suggestions/queries";
import {
  SUGGESTION_SORTS,
  SUGGESTION_STATUSES,
  type SuggestionSort,
} from "@/features/suggestions/types";
import { getViewer } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sugestões",
  description:
    "As ideias da comunidade para o MyBooks: vote, comente e acompanhe.",
};

/** A central de sugestões (MELHORIAS 8.2): pública, com voto e status. */
export default function SuggestionsPage({
  searchParams,
}: PageProps<"/sugestoes">) {
  return (
    <PageTransition>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-2">
          <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
            Sugestões
          </h1>
          <p className="text-pretty text-muted-foreground">
            As ideias da comunidade para o MyBooks. Vote nas que você quer ver,
            e a equipe conta aqui o que vai fazer.
          </p>
        </header>
        <Suspense fallback={<Skeleton className="h-96 rounded-card" />}>
          <Suggestions searchParams={searchParams} />
        </Suspense>
      </main>
    </PageTransition>
  );
}

async function Suggestions({
  searchParams,
}: {
  searchParams: PageProps<"/sugestoes">["searchParams"];
}) {
  const params = await searchParams;
  const pick = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : null;
  const sort: SuggestionSort =
    SUGGESTION_SORTS.find((item) => item.value === pick(params.ordem))?.value ??
    "votadas";
  const status =
    SUGGESTION_STATUSES.find((item) => item.value === pick(params.status))
      ?.value ?? null;
  const [first, viewer] = await Promise.all([
    getSuggestions({ sort, status, page: 0 }),
    getViewer(),
  ]);
  const href = (next: { ordem?: SuggestionSort; status?: string | null }) => {
    const query: Record<string, string> = {};
    const nextSort = next.ordem ?? sort;
    const nextStatus = next.status === undefined ? status : next.status;
    if (nextSort !== "votadas") query.ordem = nextSort;
    if (nextStatus) query.status = nextStatus;
    return { pathname: routes.sugestoes, query };
  };
  const send = (
    <NewSuggestionButton
      signedIn={Boolean(viewer)}
      autoOpen={pick(params.nova) === "1"}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Ordem" className="flex gap-1.5">
          {SUGGESTION_SORTS.map((item) => (
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
        {send}
      </div>
      <nav aria-label="Status">
        <ul className="flex flex-wrap gap-2">
          {[{ value: null, label: "Todas" }, ...SUGGESTION_STATUSES].map(
            (item) => {
              const active = item.value === status;
              return (
                <li key={item.value ?? "todas"}>
                  <Link
                    href={href({ status: item.value })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-8 items-center rounded-full border px-3 text-sm transition-colors",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-surface text-foreground hover:bg-muted",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            },
          )}
        </ul>
      </nav>
      <SuggestionList
        key={`${sort}-${status}`}
        initial={first}
        sort={sort}
        status={status}
        signedIn={Boolean(viewer)}
        // No vazio, outro botão: só o de cima abre sozinho (?nova=1)
        empty={<NewSuggestionButton signedIn={Boolean(viewer)} />}
      />
    </div>
  );
}
