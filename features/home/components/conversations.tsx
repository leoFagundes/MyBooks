import { MessagesSquare } from "lucide-react";
import Link from "next/link";
import { RelativeTime } from "@/components/ui/relative-time";
import type { ShelfConversation } from "@/features/community/queries";
import { formatNumber } from "@/lib/format";
import { routes } from "@/lib/routes";

/**
 * "Conversas sobre seus livros": os tópicos do fórum sobre o que está na
 * estante e os que a pessoa segue. Junta a comunidade ao Início sem virar
 * um segundo feed.
 */
export function Conversations({
  conversations,
}: {
  conversations: ShelfConversation[];
}) {
  if (conversations.length === 0) return null;
  return (
    <section aria-labelledby="conversas" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="conversas" className="font-serif text-xl tracking-tight">
          Conversas sobre seus livros
        </h2>
        <Link
          href={routes.comunidade}
          className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Comunidade
        </Link>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {conversations.map(({ topic, book, following }) => (
          <li key={topic.id} className="flex flex-col gap-1 py-3 first:pt-0">
            <Link
              href={routes.topic(topic.id)}
              className="line-clamp-2 font-medium text-pretty underline-offset-4 hover:underline"
            >
              {topic.title}
            </Link>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              <span className="line-clamp-1">
                {book ? `Sobre ${book.title}` : following ? "Você segue" : null}
              </span>
              <span className="flex items-center gap-1 font-mono">
                <MessagesSquare className="size-3" aria-hidden />
                {formatNumber(topic.replyCount)}
              </span>
              <RelativeTime iso={topic.lastActivityAt} className="font-mono" />
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
