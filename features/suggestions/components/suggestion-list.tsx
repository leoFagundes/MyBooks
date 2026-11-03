"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Lightbulb, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchIllustration } from "@/components/ui/illustrations";
import { formatNumber } from "@/lib/format";
import { routes } from "@/lib/routes";
import type {
  SuggestionSort,
  SuggestionStatus,
  SuggestionsPage,
} from "../types";
import { categoryLabel, statusLabel } from "../types";
import { SuggestionEditor } from "./suggestion-editor";
import { VoteButton } from "./vote-button";

async function fetchPage(
  sort: SuggestionSort,
  status: SuggestionStatus | null,
  page: number,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({ ordem: sort, pagina: String(page) });
  if (status) params.set("status", status);
  const response = await fetch(`/api/suggestions?${params}`, { signal });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as SuggestionsPage;
}

/** "Enviar sugestão": a gaveta; sem conta, leva a entrar. Abre sozinha com ?nova=1. */
export function NewSuggestionButton({
  signedIn,
  autoOpen = false,
}: {
  signedIn: boolean;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Vindo das Configurações (?nova=1): a gaveta já abre
  useEffect(() => {
    if (!autoOpen || !signedIn) return;
    const timer = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [autoOpen, signedIn]);
  if (!signedIn) {
    return (
      <Button asChild>
        <Link
          href={{
            pathname: routes.entrar,
            query: { next: "/sugestoes?nova=1" },
          }}
        >
          <Lightbulb />
          Enviar sugestão
        </Link>
      </Button>
    );
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Lightbulb />
        Enviar sugestão
      </Button>
      <SuggestionEditor open={open} onOpenChange={setOpen} />
    </>
  );
}

/** As sugestões: a primeira página do servidor e "Ver mais". */
export function SuggestionList({
  initial,
  sort,
  status,
  signedIn,
  empty,
}: {
  initial: SuggestionsPage;
  sort: SuggestionSort;
  status: SuggestionStatus | null;
  signedIn: boolean;
  empty: React.ReactNode;
}) {
  const router = useRouter();
  const query = useInfiniteQuery({
    queryKey: ["sugestoes", sort, status],
    queryFn: ({ pageParam, signal }) =>
      fetchPage(sort, status, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => last.next ?? undefined,
    initialData: { pages: [initial], pageParams: [0] },
    staleTime: 30_000,
  });
  const items = query.data.pages.flatMap((page) => page.suggestions);
  const signIn = () =>
    router.push(`${routes.entrar}?next=${encodeURIComponent("/sugestoes")}`);

  if (items.length === 0) {
    return (
      <EmptyState
        illustration={SearchIllustration}
        title="Nenhuma sugestão por aqui"
        description="Tem uma ideia para o MyBooks? Conte para a gente."
        action={empty}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex gap-4 py-5">
            <VoteButton
              suggestionId={item.id}
              votes={item.votes}
              voted={item.voted}
              signedIn={signedIn}
              onSignIn={signIn}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                <span className="rounded-full border border-border px-2 py-px">
                  {statusLabel(item.status)}
                </span>
                <span>{categoryLabel(item.category)}</span>
                {item.author ? <span>· @{item.author.username}</span> : null}
              </p>
              <h2 className="font-serif text-xl leading-snug tracking-tight text-balance">
                <Link
                  href={routes.suggestion(item.id)}
                  className="hover:underline"
                >
                  {item.title}
                </Link>
              </h2>
              {item.excerpt ? (
                <p className="line-clamp-2 text-sm text-pretty text-muted-foreground">
                  {item.excerpt}
                </p>
              ) : null}
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MessageCircle
                  className="size-3.5"
                  strokeWidth={1.5}
                  aria-hidden
                />
                {formatNumber(item.comments)}{" "}
                {item.comments === 1 ? "comentário" : "comentários"}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {query.hasNextPage ? (
        <Button
          variant="outline"
          className="self-center"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? "Carregando…" : "Ver mais"}
        </Button>
      ) : null}
    </div>
  );
}
