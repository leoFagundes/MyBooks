"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ReadersIllustration } from "@/components/ui/illustrations";
import { entranceVariants, tweens } from "@/lib/motion";
import type { TopicSort, TopicsPage } from "../types";
import { TopicCard } from "./topic-card";

async function fetchPage(
  category: string | null,
  sort: TopicSort,
  page: number,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({ ordem: sort, pagina: String(page) });
  if (category) params.set("categoria", category);
  const response = await fetch(`/api/community/topics?${params}`, { signal });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as TopicsPage;
}

/**
 * A lista do fórum: a primeira página vem do servidor (initialData) e "Ver
 * mais" traz as próximas. Cada tópico novo entra com a entrada padrão.
 */
export function TopicList({
  initial,
  category,
  sort,
  empty,
}: {
  initial: TopicsPage;
  category: string | null;
  sort: TopicSort;
  empty: React.ReactNode;
}) {
  const query = useInfiniteQuery({
    queryKey: ["forum", category, sort],
    queryFn: ({ pageParam, signal }) =>
      fetchPage(category, sort, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last) => last.next ?? undefined,
    initialData: { pages: [initial], pageParams: [0] },
    staleTime: 60_000,
  });
  const topics = query.data.pages.flatMap((page) => page.topics);

  if (topics.length === 0) {
    return (
      <EmptyState
        illustration={ReadersIllustration}
        title="Nenhum tópico por aqui ainda"
        description="Que tal abrir a primeira conversa?"
        action={empty}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col divide-y divide-border">
        {topics.map((topic, index) => (
          <motion.li
            key={topic.id}
            variants={entranceVariants}
            initial={index < 20 ? false : "hidden"}
            animate="visible"
            transition={tweens.slow}
          >
            <TopicCard topic={topic} />
          </motion.li>
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
