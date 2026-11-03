"use client";

import {
  Bell,
  BellOff,
  EyeOff,
  Lock,
  MoreHorizontal,
  Pin,
  Reply,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RelativeTime } from "@/components/ui/relative-time";
import { BookCover } from "@/features/books/components/book-cover";
import { BookLink } from "@/features/books/components/book-link";
import type { ActionResult } from "@/lib/action";
import { formatNumber } from "@/lib/format";
import { initials } from "@/lib/initials";
import { springs, tweens } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  deleteReply,
  deleteTopic,
  moderateReply,
  moderateTopic,
  toggleReaction,
  toggleSubscription,
} from "../actions";
import { plainText } from "../lib/markdown";
import type {
  ForumCategory,
  ForumReply,
  ReportTarget,
  TopicDetail,
} from "../types";
import { ReactionButton } from "./reaction-button";
import { ReplyEditor, type ReplyTarget } from "./reply-editor";
import { ReportDialog } from "./report-dialog";
import { RichText } from "./rich-text";
import { TopicEditor } from "./topic-editor";

function Byline({
  author,
  at,
  edited,
}: {
  author: ForumReply["author"];
  at: string;
  edited: string | null;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="size-8">
        {author?.avatarUrl ? (
          <AvatarImage src={author.avatarUrl} alt="" />
        ) : null}
        <AvatarFallback className="text-xs">
          {author ? initials(author.displayName) : "?"}
        </AvatarFallback>
      </Avatar>
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
        {author ? (
          <Link
            href={routes.profile(author.username)}
            className="font-medium hover:underline"
          >
            {author.displayName}
          </Link>
        ) : (
          <span className="text-muted-foreground">Conta removida</span>
        )}
        <span className="font-mono text-xs text-muted-foreground">
          <RelativeTime iso={at} />
          {edited ? " · editado" : ""}
        </span>
      </p>
    </div>
  );
}

/**
 * A página de um tópico (MELHORIAS 8): o texto (com o aviso de spoilers), as
 * reações, seguir, os livros e as respostas, um nível de aninhamento. Quem
 * escreveu edita e exclui; a equipe fixa, tranca, move e oculta.
 */
export function TopicView({
  topic,
  categories,
}: {
  topic: TopicDetail;
  categories: ForumCategory[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [revealed, setRevealed] = useState(!topic.containsSpoilers);
  const [subscribed, setSubscribed] = useState(topic.subscribed);
  const [editing, setEditing] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [report, setReport] = useState<{
    type: ReportTarget;
    id: string;
  } | null>(null);
  // As respostas da primeira vez não entram animadas; as novas, sim
  const [firstIds] = useState(
    () => new Set(topic.replies.map((reply) => reply.id)),
  );
  const viewer = topic.viewer;
  const signIn = () =>
    router.push(
      `${routes.entrar}?next=${encodeURIComponent(routes.topic(topic.id))}`,
    );

  function run(
    action: () => Promise<ActionResult>,
    message: string,
    after?: () => void,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(message);
      after?.();
      router.refresh();
    });
  }

  function reply(parent: ForumReply | null, quote: ForumReply | null) {
    if (!viewer) {
      signIn();
      return;
    }
    setReplyTarget({
      topicId: topic.id,
      parent: parent
        ? {
            id: parent.parentId ?? parent.id,
            author: parent.author?.username ?? null,
          }
        : null,
      quote: quote
        ? {
            id: quote.id,
            author: quote.author?.username ?? null,
            excerpt: plainText(quote.body).slice(0, 200),
          }
        : null,
      editing: null,
    });
  }

  const roots = topic.replies.filter((item) => !item.parentId);
  const children = (id: string) =>
    topic.replies.filter((item) => item.parentId === id);

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted-foreground">
          <Link
            href={{
              pathname: routes.comunidade,
              query: { categoria: topic.category.slug },
            }}
            className="hover:text-foreground hover:underline"
          >
            {topic.category.name}
          </Link>
          {topic.pinned ? (
            <span className="inline-flex items-center gap-1 text-foreground">
              <Pin className="size-3" strokeWidth={1.5} aria-hidden /> Fixado
            </span>
          ) : null}
          {topic.locked ? (
            <span className="inline-flex items-center gap-1 text-foreground">
              <Lock className="size-3" strokeWidth={1.5} aria-hidden /> Trancado
            </span>
          ) : null}
          {topic.hidden ? (
            <span className="text-foreground">Oculto pela equipe</span>
          ) : null}
          {topic.tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight text-balance sm:text-5xl">
          {topic.title}
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Byline
            author={topic.author}
            at={topic.createdAt}
            edited={topic.editedAt}
          />
          <div className="flex items-center gap-1">
            {viewer ? (
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={subscribed}
                onClick={() => {
                  const on = !subscribed;
                  setSubscribed(on);
                  startTransition(async () => {
                    const result = await toggleSubscription(topic.id, on);
                    if (!result.ok) {
                      setSubscribed(!on);
                      toast.error(result.error);
                    }
                  });
                }}
              >
                {subscribed ? <BellOff /> : <Bell />}
                {subscribed ? "Deixar de seguir" : "Seguir"}
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Mais ações do tópico"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {viewer?.isAuthor ? (
                  <>
                    <DropdownMenuItem onSelect={() => setEditing(true)}>
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() =>
                        run(
                          () => deleteTopic(topic.id),
                          "Tópico excluído",
                          () => router.push(routes.comunidade),
                        )
                      }
                    >
                      Excluir
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    onSelect={() =>
                      viewer
                        ? setReport({ type: "topic", id: topic.id })
                        : signIn()
                    }
                  >
                    Denunciar
                  </DropdownMenuItem>
                )}
                {viewer?.staff ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Moderação</DropdownMenuLabel>
                    <DropdownMenuItem
                      onSelect={() =>
                        run(
                          () =>
                            moderateTopic(
                              topic.id,
                              topic.pinned ? "unpin" : "pin",
                            ),
                          topic.pinned ? "Desafixado" : "Fixado",
                        )
                      }
                    >
                      {topic.pinned ? "Desafixar" : "Fixar"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        run(
                          () =>
                            moderateTopic(
                              topic.id,
                              topic.locked ? "unlock" : "lock",
                            ),
                          topic.locked ? "Destrancado" : "Trancado",
                        )
                      }
                    >
                      {topic.locked ? "Destrancar" : "Trancar"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() =>
                        run(
                          () =>
                            moderateTopic(
                              topic.id,
                              topic.hidden ? "unhide" : "hide",
                            ),
                          topic.hidden ? "Visível de novo" : "Ocultado",
                        )
                      }
                    >
                      {topic.hidden ? "Mostrar de novo" : "Ocultar"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Mover para</DropdownMenuLabel>
                    {categories
                      .filter((item) => item.slug !== topic.category.slug)
                      .map((item) => (
                        <DropdownMenuItem
                          key={item.slug}
                          onSelect={() =>
                            run(
                              () => moderateTopic(topic.id, "move", item.slug),
                              `Movido para ${item.name}`,
                            )
                          }
                        >
                          {item.name}
                        </DropdownMenuItem>
                      ))}
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {topic.books.length > 0 ? (
        <ul aria-label="Livros do tópico" className="flex flex-wrap gap-3">
          {topic.books.map((book) => (
            <li key={book.id}>
              <BookLink
                book={book}
                href={routes.book(book.id)}
                className="flex items-center gap-3 rounded-card border border-border p-2.5 pr-4 transition-colors hover:bg-muted"
              >
                <BookCover book={book} size="xs" tilt={false} />
                <span className="flex max-w-48 flex-col">
                  <span className="line-clamp-2 font-serif leading-tight">
                    {book.title}
                  </span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">
                    {book.authors.join(", ")}
                  </span>
                </span>
              </BookLink>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative">
        {revealed ? (
          <RichText source={topic.body} books={topic.bookMap} />
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-card border border-border p-5">
            <p className="inline-flex items-center gap-2 text-sm">
              <EyeOff className="size-4" strokeWidth={1.5} aria-hidden />
              Este tópico contém spoilers.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevealed(true)}
            >
              Mostrar o texto
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ReactionButton
          kind="like"
          count={topic.reactions.like}
          active={topic.reactions.mine.includes("like")}
          signedIn={Boolean(viewer)}
          onSignIn={signIn}
          onToggle={(on) =>
            toggleReaction({ target: "topic", id: topic.id, kind: "like", on })
          }
        />
        <ReactionButton
          kind="useful"
          count={topic.reactions.useful}
          active={topic.reactions.mine.includes("useful")}
          signedIn={Boolean(viewer)}
          onSignIn={signIn}
          onToggle={(on) =>
            toggleReaction({
              target: "topic",
              id: topic.id,
              kind: "useful",
              on,
            })
          }
        />
      </div>

      <section
        aria-labelledby="respostas"
        className="flex flex-col gap-4 border-t border-border pt-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="respostas" className="font-serif text-2xl tracking-tight">
            {topic.replies.length === 0
              ? "Nenhuma resposta ainda"
              : `${formatNumber(topic.replies.filter((item) => !item.deleted).length)} ${topic.replies.length === 1 ? "resposta" : "respostas"}`}
          </h2>
          {topic.locked && !viewer?.staff ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Lock className="size-4" strokeWidth={1.5} aria-hidden />
              Trancado: não aceita respostas.
            </p>
          ) : (
            <Button onClick={() => reply(null, null)}>
              <Reply />
              Responder
            </Button>
          )}
        </div>
        <ul className="flex flex-col">
          <AnimatePresence initial={false}>
            {roots.map((root) => (
              <motion.li
                key={root.id}
                layout
                initial={firstIds.has(root.id) ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: tweens.fast }}
                transition={springs.smooth}
                className="flex flex-col border-b border-border py-5 last:border-b-0"
              >
                <ReplyItem
                  reply={root}
                  topic={topic}
                  onReply={() => reply(root, null)}
                  onQuote={() => reply(null, root)}
                  onEdit={() =>
                    setReplyTarget({
                      topicId: topic.id,
                      parent: null,
                      quote: null,
                      editing: { id: root.id, body: root.body },
                    })
                  }
                  onReport={() =>
                    viewer
                      ? setReport({ type: "reply", id: root.id })
                      : signIn()
                  }
                  run={run}
                  signIn={signIn}
                />
                {children(root.id).length > 0 ? (
                  <ul className="mt-4 ml-5 flex flex-col gap-4 border-l border-border pl-5">
                    <AnimatePresence initial={false}>
                      {children(root.id).map((child) => (
                        <motion.li
                          key={child.id}
                          layout
                          initial={
                            firstIds.has(child.id)
                              ? false
                              : { opacity: 0, y: 12 }
                          }
                          animate={{ opacity: 1, y: 0 }}
                          transition={springs.smooth}
                        >
                          <ReplyItem
                            reply={child}
                            topic={topic}
                            onReply={() => reply(root, null)}
                            onQuote={() => reply(root, child)}
                            onEdit={() =>
                              setReplyTarget({
                                topicId: topic.id,
                                parent: null,
                                quote: null,
                                editing: { id: child.id, body: child.body },
                              })
                            }
                            onReport={() =>
                              viewer
                                ? setReport({ type: "reply", id: child.id })
                                : signIn()
                            }
                            run={run}
                            signIn={signIn}
                          />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                ) : null}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>

      <ReplyEditor
        target={replyTarget}
        books={topic.bookMap}
        onClose={() => setReplyTarget(null)}
        onPosted={() => undefined}
      />
      <ReportDialog
        target={report}
        open={report !== null}
        onOpenChange={(open) => (open ? null : setReport(null))}
      />
      {viewer?.isAuthor ? (
        <TopicEditor
          open={editing}
          onOpenChange={setEditing}
          categories={categories}
          topicId={topic.id}
          initial={{
            category: topic.category.slug,
            title: topic.title,
            body: topic.body,
            tags: topic.tags.join(", "),
            containsSpoilers: topic.containsSpoilers,
            books: topic.books,
          }}
        />
      ) : null}
    </article>
  );
}

function ReplyItem({
  reply,
  topic,
  onReply,
  onQuote,
  onEdit,
  onReport,
  run,
  signIn,
}: {
  reply: ForumReply;
  topic: TopicDetail;
  onReply: () => void;
  onQuote: () => void;
  onEdit: () => void;
  onReport: () => void;
  run: (action: () => Promise<ActionResult>, message: string) => void;
  signIn: () => void;
}) {
  const viewer = topic.viewer;
  if (reply.deleted) {
    return (
      <p className="text-sm text-muted-foreground italic">Resposta excluída.</p>
    );
  }
  const mine = viewer?.id === reply.author?.id;
  const open = !topic.locked || viewer?.staff;
  return (
    <div className={cn("flex flex-col gap-3", reply.hidden && "opacity-60")}>
      <Byline
        author={reply.author}
        at={reply.createdAt}
        edited={reply.editedAt}
      />
      {reply.hidden ? (
        <p className="font-mono text-xs text-foreground">
          Oculta pela equipe (só você e a equipe veem).
        </p>
      ) : null}
      {reply.quoted ? (
        <blockquote className="border-l-2 border-border-strong pl-3 text-sm text-pretty text-muted-foreground">
          {reply.quoted.author ? (
            <span className="font-mono text-xs">@{reply.quoted.author}: </span>
          ) : null}
          {reply.quoted.excerpt}
        </blockquote>
      ) : null}
      <RichText source={reply.body} books={topic.bookMap} />
      <div className="flex flex-wrap items-center gap-1.5">
        <ReactionButton
          kind="like"
          count={reply.reactions.like}
          active={reply.reactions.mine.includes("like")}
          signedIn={Boolean(viewer)}
          onSignIn={signIn}
          onToggle={(on) =>
            toggleReaction({ target: "reply", id: reply.id, kind: "like", on })
          }
        />
        <ReactionButton
          kind="useful"
          count={reply.reactions.useful}
          active={reply.reactions.mine.includes("useful")}
          signedIn={Boolean(viewer)}
          onSignIn={signIn}
          onToggle={(on) =>
            toggleReaction({
              target: "reply",
              id: reply.id,
              kind: "useful",
              on,
            })
          }
        />
        {open ? (
          <>
            <Button variant="ghost" size="sm" onClick={onReply}>
              Responder
            </Button>
            <Button variant="ghost" size="sm" onClick={onQuote}>
              Citar
            </Button>
          </>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Mais ações da resposta"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {mine ? (
              <>
                <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() =>
                    run(() => deleteReply(reply.id), "Resposta excluída")
                  }
                >
                  Excluir
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={onReport}>Denunciar</DropdownMenuItem>
            )}
            {viewer?.staff ? (
              <DropdownMenuItem
                onSelect={() =>
                  run(
                    () => moderateReply(reply.id, !reply.hidden),
                    reply.hidden ? "Visível de novo" : "Resposta ocultada",
                  )
                }
              >
                {reply.hidden ? "Mostrar de novo" : "Ocultar"}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
