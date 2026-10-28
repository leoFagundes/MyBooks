"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyBookScope } from "@/features/shelf/components/copy-book";
import {
  entranceTransition,
  entranceVariants,
  staggerDelay,
  tweens,
} from "@/lib/motion";
import type { FeedCursor, FeedPage } from "../../types";
import { FeedCard } from "./feed-card";

// Os primeiros cards entram em sequência; os que chegam rolando, um a um
const SEQUENCED_ITEMS = 8;

/**
 * Cada card entra quando aparece (spec §3, momento 3). O grupo de entradas
 * da lista inteira não serve aqui: numa lista longa, a fração dela que
 * precisa estar na tela nunca aparece de uma vez.
 */
function FeedItem({
  index,
  children,
}: {
  index: number;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.div
      variants={entranceVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={entranceTransition(reduced, {
        ...tweens.slow,
        delay: index < SEQUENCED_ITEMS ? index * staggerDelay : 0,
      })}
    >
      {children}
    </motion.div>
  );
}

async function fetchFeed(cursor: FeedCursor | null): Promise<FeedPage> {
  if (!cursor) return { groups: [], next: null };
  const params = new URLSearchParams({ antes: cursor.at, id: cursor.id });
  const response = await fetch(`/api/feed?${params}`);
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as FeedPage;
}

/**
 * O feed de quem a pessoa segue (spec §5.3), com scroll infinito: a
 * primeira página vem do servidor e as outras chegam quando o fim da lista
 * se aproxima. A chave muda quando o servidor manda um feed novo.
 */
export function Feed({
  first,
  ownedIds,
}: {
  first: FeedPage;
  /** Os livros que quem vê já tem (o selo "Na sua estante"). */
  ownedIds: string[];
}) {
  const feed = useInfiniteQuery({
    queryKey: ["feed", first.groups[0]?.key ?? "vazio"],
    queryFn: ({ pageParam }) => fetchFeed(pageParam),
    initialPageParam: null as FeedCursor | null,
    getNextPageParam: (last) => last.next,
    initialData: { pages: [first], pageParams: [null] },
    staleTime: 60_000,
  });
  const owned = new Set(ownedIds);
  const sentinel = useRef<HTMLDivElement>(null);
  const {
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    fetchNextPage,
  } = feed;

  // Busca a próxima página um pouco antes de a lista acabar
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage || isFetchingNextPage || isFetchNextPageError)
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchNextPage();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const groups = feed.data.pages.flatMap((page) => page.groups);

  return (
    <CopyBookScope>
      <div className="flex flex-col gap-8">
        {groups.map((group, index) => (
          <FeedItem key={group.key} index={index}>
            <FeedCard group={group} owned={owned} />
          </FeedItem>
        ))}
      </div>
      <div ref={sentinel} className="flex justify-center pt-8">
        {isFetchingNextPage ? (
          <div
            aria-busy
            aria-label="Carregando mais"
            className="flex w-full gap-3"
          >
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-28 w-20 rounded-cover" />
            </div>
          </div>
        ) : isFetchNextPageError ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Não deu para carregar mais agora.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchNextPage()}
            >
              Tentar de novo
            </Button>
          </div>
        ) : !hasNextPage ? (
          <p className="font-mono text-xs text-muted-foreground">
            Isso é tudo por agora.
          </p>
        ) : null}
      </div>
    </CopyBookScope>
  );
}
