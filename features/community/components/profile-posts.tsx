import { Heart } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatNumber } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { ProfileReply } from "../queries";
import type { TopicSummary } from "../types";
import { TopicCard } from "./topic-card";

/**
 * A aba Publicações do perfil: os tópicos que a pessoa abriu e, abaixo, as
 * respostas que deu, cada uma levando direto ao ponto da conversa.
 */
export function ProfilePosts({
  topics,
  replies,
}: {
  topics: TopicSummary[];
  replies: ProfileReply[];
}) {
  return (
    <div className="flex flex-col gap-10">
      {topics.length > 0 ? (
        <section aria-labelledby="publicacoes-topicos">
          <h2
            id="publicacoes-topicos"
            className="flex items-baseline gap-2 font-serif text-2xl tracking-tight"
          >
            Tópicos
            <span className="font-mono text-xs text-muted-foreground">
              {formatNumber(topics.length)}
            </span>
          </h2>
          <ul className="flex flex-col divide-y divide-border">
            {topics.map((topic) => (
              <li key={topic.id}>
                <TopicCard topic={topic} titleAs="h3" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {replies.length > 0 ? (
        <section aria-labelledby="publicacoes-respostas">
          <h2
            id="publicacoes-respostas"
            className="flex items-baseline gap-2 font-serif text-2xl tracking-tight"
          >
            Respostas
            <span className="font-mono text-xs text-muted-foreground">
              {formatNumber(replies.length)}
            </span>
          </h2>
          <ul className="flex flex-col divide-y divide-border">
            {replies.map((reply) => (
              <li key={reply.id} className="flex flex-col gap-1.5 py-5">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-muted-foreground">
                  <span>Resposta</span>
                  <span aria-hidden>·</span>
                  <RelativeTime iso={reply.createdAt} />
                  {reply.likeCount > 0 ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Heart
                          className="size-3"
                          strokeWidth={1.5}
                          aria-hidden
                        />
                        <span className="sr-only">Curtidas:</span>
                        {formatNumber(reply.likeCount)}
                      </span>
                    </>
                  ) : null}
                </p>
                <h3 className="font-serif text-lg leading-snug tracking-tight text-balance">
                  <Link
                    href={
                      `${routes.topic(reply.topic.id)}#resposta-${reply.id}` as Route
                    }
                    className="hover:underline"
                  >
                    {reply.topic.title}
                  </Link>
                </h3>
                {reply.excerpt ? (
                  <p className="line-clamp-3 text-sm text-pretty text-muted-foreground">
                    {reply.excerpt}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
