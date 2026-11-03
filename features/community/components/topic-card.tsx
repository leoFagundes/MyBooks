import { EyeOff, Heart, Lock, MessageCircle, Pin } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RelativeTime } from "@/components/ui/relative-time";
import { BookCover } from "@/features/books/components/book-cover";
import { formatNumber } from "@/lib/format";
import { initials } from "@/lib/initials";
import { routes } from "@/lib/routes";
import type { TopicSummary } from "../types";

/**
 * Um tópico na lista do fórum: título em serif, o começo do texto (nada, se
 * tem spoilers), quem abriu, a categoria, as tags e os números. Editorial e
 * limpo: uma linha por tópico, sem caixa.
 */
export function TopicCard({ topic }: { topic: TopicSummary }) {
  return (
    <article className="flex gap-4 py-5">
      <Avatar className="mt-1 size-9 shrink-0">
        {topic.author?.avatarUrl ? (
          <AvatarImage src={topic.author.avatarUrl} alt="" />
        ) : null}
        <AvatarFallback className="text-xs">
          {topic.author ? initials(topic.author.displayName) : "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-muted-foreground">
          {topic.pinned ? (
            <span className="inline-flex items-center gap-1 text-foreground">
              <Pin className="size-3" strokeWidth={1.5} aria-hidden />
              Fixado
            </span>
          ) : null}
          <Link
            href={
              `${routes.comunidade}?categoria=${topic.category.slug}` as typeof routes.comunidade
            }
            className="hover:text-foreground hover:underline"
          >
            {topic.category.name}
          </Link>
          <span aria-hidden>·</span>
          <span>
            {topic.author ? `@${topic.author.username}` : "conta removida"}
          </span>
          <span aria-hidden>·</span>
          <RelativeTime iso={topic.lastActivityAt} />
        </p>
        <h2 className="font-serif text-xl leading-snug tracking-tight text-balance">
          <Link href={routes.topic(topic.id)} className="hover:underline">
            {topic.title}
          </Link>
        </h2>
        {topic.containsSpoilers ? (
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <EyeOff className="size-3.5" strokeWidth={1.5} aria-hidden />
            Contém spoilers
          </p>
        ) : topic.excerpt ? (
          <p className="line-clamp-2 text-sm text-pretty text-muted-foreground">
            {topic.excerpt}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3.5" strokeWidth={1.5} aria-hidden />
            {formatNumber(topic.replyCount)}{" "}
            {topic.replyCount === 1 ? "resposta" : "respostas"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3.5" strokeWidth={1.5} aria-hidden />
            {formatNumber(topic.likeCount)}
          </span>
          {topic.locked ? (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3.5" strokeWidth={1.5} aria-hidden />
              Trancado
            </span>
          ) : null}
          {topic.hidden ? (
            <span className="text-foreground">Oculto</span>
          ) : null}
          {topic.tags.map((tag) => (
            <span key={tag} className="font-mono">
              #{tag}
            </span>
          ))}
        </div>
      </div>
      {topic.books[0] ? (
        <div className="hidden w-12 shrink-0 sm:block">
          <BookCover book={topic.books[0]} size="xs" tilt={false} />
        </div>
      ) : null}
    </article>
  );
}
