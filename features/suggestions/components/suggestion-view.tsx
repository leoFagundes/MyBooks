"use client";

import { BadgeCheck, MoreHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fieldClasses } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RelativeTime } from "@/components/ui/relative-time";
import { Textarea } from "@/components/ui/textarea";
import type { BookVisual } from "@/features/books/types";
import { MarkdownEditor } from "@/features/community/components/markdown-editor";
import { ReportDialog } from "@/features/community/components/report-dialog";
import { RichText } from "@/features/community/components/rich-text";
import type { ReportTarget } from "@/features/community/types";
import type { ActionResult } from "@/lib/action";
import { formatNumber } from "@/lib/format";
import { initials } from "@/lib/initials";
import { springs, tweens } from "@/lib/motion";
import { routes } from "@/lib/routes";
import {
  createComment,
  deleteOwn,
  hideSuggestionContent,
  setSuggestionStatus,
} from "../actions";
import {
  categoryLabel,
  statusLabel,
  SUGGESTION_STATUSES,
  type SuggestionDetail,
} from "../types";
import { VoteButton } from "./vote-button";

/**
 * Uma sugestão (MELHORIAS 8.2): o voto, o texto, a resposta oficial em
 * destaque, o status (que só o admin muda) e os comentários.
 */
export function SuggestionView({
  suggestion,
}: {
  suggestion: SuggestionDetail;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [report, setReport] = useState<{
    type: ReportTarget;
    id: string;
  } | null>(null);
  const [firstIds] = useState(
    () => new Set(suggestion.commentsList.map((item) => item.id)),
  );
  const viewer = suggestion.viewer;
  const signIn = () =>
    router.push(
      `${routes.entrar}?next=${encodeURIComponent(routes.suggestion(suggestion.id))}`,
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

  return (
    <article className="flex flex-col gap-8">
      <header className="flex gap-5">
        <VoteButton
          suggestionId={suggestion.id}
          votes={suggestion.votes}
          voted={suggestion.voted}
          signedIn={Boolean(viewer)}
          onSignIn={signIn}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="rounded-full border border-foreground px-2 py-px text-foreground">
              {statusLabel(suggestion.status)}
            </span>
            <span>{categoryLabel(suggestion.category)}</span>
            {suggestion.hidden ? (
              <span className="text-foreground">Oculta pela equipe</span>
            ) : null}
          </p>
          <h1 className="font-serif text-4xl leading-tight tracking-tight text-balance">
            {suggestion.title}
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {suggestion.author ? (
              <Link
                href={routes.profile(suggestion.author.username)}
                className="hover:underline"
              >
                @{suggestion.author.username}
              </Link>
            ) : (
              "conta removida"
            )}
            <span aria-hidden>·</span>
            <RelativeTime iso={suggestion.createdAt} />
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Mais ações da sugestão"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {viewer?.isAuthor ? (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() =>
                  run(
                    () => deleteOwn("suggestion", suggestion.id),
                    "Sugestão excluída",
                    () => router.push(routes.sugestoes),
                  )
                }
              >
                Excluir
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={() =>
                  viewer
                    ? setReport({ type: "suggestion", id: suggestion.id })
                    : signIn()
                }
              >
                Denunciar
              </DropdownMenuItem>
            )}
            {viewer?.staff ? (
              <DropdownMenuItem
                onSelect={() =>
                  run(
                    () =>
                      hideSuggestionContent(
                        "suggestion",
                        suggestion.id,
                        !suggestion.hidden,
                      ),
                    suggestion.hidden ? "Visível de novo" : "Sugestão ocultada",
                  )
                }
              >
                {suggestion.hidden ? "Mostrar de novo" : "Ocultar"}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <RichText source={suggestion.body} />

      {suggestion.response ? (
        <aside
          aria-label="Resposta oficial"
          className="flex flex-col gap-2 rounded-card border border-foreground p-5"
        >
          <p className="inline-flex items-center gap-2 text-sm font-medium">
            <BadgeCheck className="size-4" strokeWidth={1.5} aria-hidden />
            Resposta da equipe
            {suggestion.response.at ? (
              <span className="font-mono text-xs font-normal text-muted-foreground">
                <RelativeTime iso={suggestion.response.at} />
              </span>
            ) : null}
          </p>
          <RichText source={suggestion.response.text} />
        </aside>
      ) : null}

      {viewer?.admin ? (
        <StatusForm suggestion={suggestion} onSaved={() => router.refresh()} />
      ) : null}

      <section
        aria-labelledby="comentarios"
        className="flex flex-col gap-4 border-t border-border pt-8"
      >
        <h2 id="comentarios" className="font-serif text-2xl tracking-tight">
          {suggestion.comments === 0
            ? "Nenhum comentário ainda"
            : `${formatNumber(suggestion.comments)} ${suggestion.comments === 1 ? "comentário" : "comentários"}`}
        </h2>
        <ul className="flex flex-col">
          <AnimatePresence initial={false}>
            {suggestion.commentsList.map((comment) => (
              <motion.li
                key={comment.id}
                layout
                initial={
                  firstIds.has(comment.id) ? false : { opacity: 0, y: 12 }
                }
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: tweens.fast }}
                transition={springs.smooth}
                className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0"
              >
                {comment.deleted ? (
                  <p className="text-sm text-muted-foreground italic">
                    Comentário excluído.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-7">
                          {comment.author?.avatarUrl ? (
                            <AvatarImage
                              src={comment.author.avatarUrl}
                              alt=""
                            />
                          ) : null}
                          <AvatarFallback className="text-[10px]">
                            {comment.author
                              ? initials(comment.author.displayName)
                              : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-sm">
                          <span className="font-medium">
                            {comment.author?.displayName ?? "Conta removida"}
                          </span>{" "}
                          <span className="font-mono text-xs text-muted-foreground">
                            <RelativeTime iso={comment.createdAt} />
                          </span>
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Mais ações do comentário"
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {viewer?.id === comment.author?.id ? (
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() =>
                                run(
                                  () => deleteOwn("comment", comment.id),
                                  "Comentário excluído",
                                )
                              }
                            >
                              Excluir
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={() =>
                                viewer
                                  ? setReport({
                                      type: "suggestion_comment",
                                      id: comment.id,
                                    })
                                  : signIn()
                              }
                            >
                              Denunciar
                            </DropdownMenuItem>
                          )}
                          {viewer?.staff ? (
                            <DropdownMenuItem
                              onSelect={() =>
                                run(
                                  () =>
                                    hideSuggestionContent(
                                      "comment",
                                      comment.id,
                                      !comment.hidden,
                                    ),
                                  comment.hidden
                                    ? "Visível de novo"
                                    : "Comentário ocultado",
                                )
                              }
                            >
                              {comment.hidden ? "Mostrar de novo" : "Ocultar"}
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {comment.hidden ? (
                      <p className="font-mono text-xs">Oculto pela equipe.</p>
                    ) : null}
                    <RichText source={comment.body} className="text-sm" />
                  </>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {viewer ? (
          <CommentForm
            suggestionId={suggestion.id}
            onPosted={() => router.refresh()}
          />
        ) : (
          <Button variant="outline" className="self-start" onClick={signIn}>
            Entre para comentar
          </Button>
        )}
      </section>
      <ReportDialog
        target={report}
        open={report !== null}
        onOpenChange={(open) => (open ? null : setReport(null))}
      />
    </article>
  );
}

function CommentForm({
  suggestionId,
  onPosted,
}: {
  suggestionId: string;
  onPosted: () => void;
}) {
  const id = useId();
  const [body, setBody] = useState("");
  const [books, setBooks] = useState<Record<string, BookVisual>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createComment(suggestionId, body);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setBody("");
          onPosted();
        });
      }}
    >
      <Label htmlFor={`${id}-comentario`}>Comentar</Label>
      <MarkdownEditor
        id={`${id}-comentario`}
        value={body}
        onChange={setBody}
        books={books}
        onBook={(book) =>
          setBooks((current) => ({ ...current, [book.id]: book }))
        }
        maxLength={3000}
        rows={3}
      />
      <div aria-live="polite">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <Button
        type="submit"
        className="self-end"
        disabled={pending || !body.trim()}
        aria-busy={pending}
      >
        {pending ? "Publicando…" : "Comentar"}
      </Button>
    </form>
  );
}

/** O status e a resposta oficial, só para o admin. Quem votou é avisado. */
function StatusForm({
  suggestion,
  onSaved,
}: {
  suggestion: SuggestionDetail;
  onSaved: () => void;
}) {
  const id = useId();
  const [status, setStatus] = useState<string>(suggestion.status);
  const [response, setResponse] = useState(suggestion.response?.text ?? "");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-col gap-3 rounded-card border border-dashed border-border p-5"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await setSuggestionStatus({
            suggestionId: suggestion.id,
            status,
            response,
          });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Status salvo", {
            description: "Quem votou vai ser avisado.",
          });
          onSaved();
        });
      }}
    >
      <p className="text-sm font-medium">Equipe: status e resposta oficial</p>
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor={`${id}-status`}>Status</Label>
        <select
          id={`${id}-status`}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={`${fieldClasses} h-10`}
        >
          {SUGGESTION_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-resposta`}>Resposta oficial (opcional)</Label>
        <Textarea
          id={`${id}-resposta`}
          rows={3}
          maxLength={2000}
          value={response}
          onChange={(event) => setResponse(event.target.value)}
        />
      </div>
      <Button
        type="submit"
        className="self-start"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
