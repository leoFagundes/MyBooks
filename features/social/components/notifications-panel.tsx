"use client";

import { useQueryClient } from "@tanstack/react-query";
import { BookCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QuietBellIllustration } from "@/components/ui/illustrations";
import { RelativeTime } from "@/components/ui/relative-time";
import { Skeleton } from "@/components/ui/skeleton";
import type { ActionResult } from "@/lib/action";
import { initials } from "@/lib/initials";
import { springs, tweens } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { acceptFollowRequest, declineFollowRequest } from "../actions";
import {
  NOTIFICATIONS_KEY,
  type useNotifications,
} from "../lib/use-notifications";
import type {
  FollowRequest,
  NotificationItem,
  ReviewNotice,
  NotificationsPayload,
  Reader,
} from "../types";

type NotificationsQuery = ReturnType<typeof useNotifications>;

function ReaderAvatar({ reader }: { reader: Reader | null }) {
  return (
    <Avatar className="size-9">
      {reader?.avatarUrl ? <AvatarImage src={reader.avatarUrl} alt="" /> : null}
      <AvatarFallback className="text-xs">
        {reader ? initials(reader.displayName) : "?"}
      </AvatarFallback>
    </Avatar>
  );
}

const VERB: Record<NotificationItem["type"], string> = {
  follow: "começou a seguir você",
  collection_like: "curtiu",
  collection_copy: "copiou",
  collection_invite: "chamou você para",
  catalog_review: "",
};

// O que a equipe decidiu, numa frase (o título entra em destaque)
const REVIEW: Record<ReviewNotice["kind"], { before: string; after: string }> =
  {
    book_approved: {
      before: "Seu livro",
      after: "foi aprovado e já aparece na busca.",
    },
    book_rejected: {
      before: "Seu livro",
      after: "não foi aprovado para a busca.",
    },
    book_merged: {
      before: "",
      after: "era um duplicado e foi juntado ao livro certo.",
    },
    suggestion_approved: {
      before: "Sua sugestão para",
      after: "foi aceita. Obrigado!",
    },
    suggestion_rejected: {
      before: "Sua sugestão para",
      after: "não foi aceita.",
    },
    genre_approved: {
      before: "O gênero",
      after: "foi aprovado e já aparece para todos.",
    },
    genre_rejected: { before: "O gênero", after: "não foi aprovado." },
  };

// Sem a coleção (apagada ou fora do alcance), a frase fica completa assim mesmo
const WITHOUT_COLLECTION: Record<NotificationItem["type"], string> = {
  follow: "",
  collection_like: "uma coleção sua",
  collection_copy: "uma coleção sua",
  collection_invite: "uma coleção",
  catalog_review: "",
};

function hrefOf(item: NotificationItem) {
  if (item.type === "catalog_review") {
    return item.review?.bookId ? routes.book(item.review.bookId) : null;
  }
  if (item.type !== "follow" && item.collection) {
    return routes.collection(item.collection.id);
  }
  return item.actor ? routes.profile(item.actor.username) : null;
}

/**
 * O conteúdo do popover de notificações (spec §5.10): os pedidos para seguir
 * no topo, com Aceitar e Recusar, e embaixo os avisos, com um ponto nos que
 * chegaram desde a última vez que o popover abriu.
 */
export function NotificationsPanel({
  query,
  fresh,
  onNavigate,
}: {
  query: NotificationsQuery;
  /** Os avisos que estavam sem ler quando o popover abriu. */
  fresh: ReadonlySet<string>;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col">
      <p className="border-b border-border px-4 py-3 text-sm font-medium">
        Notificações
      </p>
      <PanelBody query={query} fresh={fresh} onNavigate={onNavigate} />
    </div>
  );
}

function PanelBody({
  query,
  fresh,
  onNavigate,
}: {
  query: NotificationsQuery;
  fresh: ReadonlySet<string>;
  onNavigate: () => void;
}) {
  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Não deu para carregar os avisos agora.
        </p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (query.isPending && query.fetchStatus !== "idle") {
    return (
      <div aria-busy aria-label="Carregando os avisos" className="px-4 py-2">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3 py-2.5">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  const data = query.data;
  if (!data || (data.requests.length === 0 && data.items.length === 0)) {
    return (
      <EmptyState
        illustration={QuietBellIllustration}
        title="Tudo em dia"
        description="Quando alguém seguir você ou curtir uma coleção, aparece aqui."
        className="rounded-none border-0"
      />
    );
  }

  return (
    <div className="flex flex-col">
      {data.requests.length > 0 ? (
        <section aria-labelledby="pedidos-para-seguir">
          <h3
            id="pedidos-para-seguir"
            className="px-4 pt-3 font-mono text-[11px] tracking-wide text-muted-foreground uppercase"
          >
            Pedidos para seguir
          </h3>
          <ul className="flex flex-col">
            <AnimatePresence initial={false}>
              {data.requests.map((request) => (
                <RequestRow
                  key={request.reader.id}
                  request={request}
                  onNavigate={onNavigate}
                />
              ))}
            </AnimatePresence>
          </ul>
        </section>
      ) : null}
      {data.items.length > 0 ? (
        <ul
          aria-label="Avisos"
          className={cn(data.requests.length > 0 && "border-t border-border")}
        >
          {data.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              fresh={fresh.has(item.id)}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function RequestRow({
  request,
  onNavigate,
}: {
  request: FollowRequest;
  onNavigate: () => void;
}) {
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const { reader } = request;

  // Sai da lista na hora; o aviso de seguidor chega quando a lista volta
  function answer(action: (id: string) => Promise<ActionResult>) {
    queryClient.setQueryData<NotificationsPayload>(NOTIFICATIONS_KEY, (data) =>
      data
        ? {
            ...data,
            requests: data.requests.filter(
              (item) => item.reader.id !== reader.id,
            ),
          }
        : data,
    );
    startTransition(async () => {
      const result = await action(reader.id);
      if (!result.ok) toast.error(result.error);
      await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    });
  }

  return (
    <motion.li
      layout
      exit={{ opacity: 0, transition: tweens.fast }}
      transition={springs.snappy}
      className="flex items-start gap-3 px-4 py-3"
    >
      <ReaderAvatar reader={reader} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm text-pretty">
          <Link
            href={routes.profile(reader.username)}
            onClick={onNavigate}
            className="rounded-sm font-medium hover:underline hover:decoration-border-strong hover:underline-offset-4"
          >
            {reader.displayName}
          </Link>{" "}
          quer seguir você <RelativeTime iso={request.at} />
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => answer(acceptFollowRequest)}
            aria-label={`Aceitar o pedido de @${reader.username}`}
          >
            Aceitar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => answer(declineFollowRequest)}
            aria-label={`Recusar o pedido de @${reader.username}`}
          >
            Recusar
          </Button>
        </div>
      </div>
    </motion.li>
  );
}

function ItemRow({
  item,
  fresh,
  onNavigate,
}: {
  item: NotificationItem;
  fresh: boolean;
  onNavigate: () => void;
}) {
  const href = hrefOf(item);
  const review = item.type === "catalog_review" ? item.review : null;
  const content = review ? (
    <>
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted"
      >
        <BookCheck className="size-4" strokeWidth={1.5} />
      </span>
      <p className="min-w-0 flex-1 text-sm text-pretty">
        <span className="sr-only">Da equipe do MyBooks: </span>
        {REVIEW[review.kind].before ? `${REVIEW[review.kind].before} ` : ""}
        <span className="font-medium">{review.title}</span>{" "}
        {REVIEW[review.kind].after}
        {review.note ? (
          <span className="mt-0.5 block text-muted-foreground">
            {review.note}
          </span>
        ) : null}{" "}
        <RelativeTime iso={item.at} />
      </p>
      {fresh ? (
        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground">
          <span className="sr-only">Novo</span>
        </span>
      ) : null}
    </>
  ) : (
    <>
      <ReaderAvatar reader={item.actor} />
      <p className="min-w-0 flex-1 text-sm text-pretty">
        <span className="font-medium">
          {item.actor?.displayName ?? "Alguém"}
        </span>{" "}
        {VERB[item.type]}
        {item.type !== "follow" ? (
          <>
            {" "}
            {item.collection ? (
              <span className="font-medium">{item.collection.title}</span>
            ) : (
              WITHOUT_COLLECTION[item.type]
            )}
          </>
        ) : null}{" "}
        <RelativeTime iso={item.at} />
      </p>
      {fresh ? (
        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-foreground">
          <span className="sr-only">Novo</span>
        </span>
      ) : null}
    </>
  );
  const row = "flex items-start gap-3 px-4 py-3";

  return (
    <li>
      {href ? (
        <Link
          href={href}
          onClick={onNavigate}
          className={cn(
            row,
            "transition-colors hover:bg-muted focus-visible:-outline-offset-2",
          )}
        >
          {content}
        </Link>
      ) : (
        <div className={row}>{content}</div>
      )}
    </li>
  );
}
