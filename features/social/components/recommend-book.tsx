"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { BookVisual } from "@/features/books/types";
import { initials } from "@/lib/initials";
import { tweens } from "@/lib/motion";
import { recommendBook } from "../actions";
import type { Reader } from "../types";

const NOTE_MAX = 280;

async function fetchFollowers(query: string, signal: AbortSignal) {
  const response = await fetch(
    `/api/readers/followers?q=${encodeURIComponent(query)}`,
    { signal },
  );
  if (!response.ok) throw new Error(String(response.status));
  return ((await response.json()) as { readers: Reader[] }).readers;
}

/**
 * "Indicar a alguém" na página do livro: escolher entre quem segue você (só
 * a essas pessoas dá para indicar), uma frase se quiser, e o livro chega no
 * sino dela com "Pôr na fila".
 */
export function RecommendBook({ book }: { book: BookVisual }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<Reader | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const followers = useQuery({
    queryKey: ["indicar", query.trim()],
    queryFn: ({ signal }) => fetchFollowers(query.trim(), signal),
    enabled: open,
    staleTime: 60 * 1000,
  });

  function reset() {
    setQuery("");
    setChosen(null);
    setNote("");
    setError(null);
  }

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (!chosen) return;
    setError(null);
    startTransition(async () => {
      const result = await recommendBook({
        bookId: book.id,
        recipientId: chosen.id,
        note,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Indicado para @${chosen.username}`, {
        description: book.title,
      });
      setOpen(false);
      reset();
    });
  }

  const readers = followers.data ?? [];

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className="self-start">
          <Send />
          Indicar a alguém
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {chosen ? (
            <motion.form
              key="frase"
              onSubmit={send}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12, transition: tweens.fast }}
              transition={tweens.base}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Escolher outra pessoa"
                  onClick={() => {
                    setChosen(null);
                    setError(null);
                  }}
                >
                  <ArrowLeft />
                </Button>
                <p className="min-w-0 text-sm">
                  Para <span className="font-medium">@{chosen.username}</span>
                </p>
              </div>
              <label htmlFor={`${id}-frase`} className="sr-only">
                Uma frase sobre o livro (opcional)
              </label>
              <Textarea
                id={`${id}-frase`}
                rows={3}
                maxLength={NOTE_MAX}
                placeholder="Por que você indica? (opcional)"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <p className="text-right font-mono text-[11px] text-muted-foreground">
                {note.length}/{NOTE_MAX}
              </p>
              <div aria-live="polite">
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
              </div>
              <Button type="submit" disabled={pending} aria-busy={pending}>
                {pending ? "Indicando…" : "Indicar"}
              </Button>
            </motion.form>
          ) : (
            <motion.div
              key="quem"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12, transition: tweens.fast }}
              transition={tweens.base}
              className="flex flex-col gap-2"
            >
              <label
                htmlFor={`${id}-busca`}
                className="px-1 font-mono text-[11px] tracking-wide text-muted-foreground uppercase"
              >
                Para quem segue você
              </label>
              <Input
                id={`${id}-busca`}
                placeholder="Nome ou @"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
              />
              {followers.isPending ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  Procurando…
                </p>
              ) : readers.length === 0 ? (
                <p className="px-1 py-2 text-sm text-pretty text-muted-foreground">
                  {query.trim()
                    ? "Ninguém que segue você com esse nome."
                    : "Ninguém segue você ainda: dá para indicar só a quem segue."}
                </p>
              ) : (
                <ul aria-label="Quem segue você" className="flex flex-col">
                  {readers.map((reader) => (
                    <li key={reader.id}>
                      <button
                        type="button"
                        onClick={() => setChosen(reader)}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-control px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                      >
                        <Avatar className="size-7">
                          {reader.avatarUrl ? (
                            <AvatarImage src={reader.avatarUrl} alt="" />
                          ) : null}
                          <AvatarFallback className="text-[10px]">
                            {initials(reader.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex min-w-0 flex-col">
                          <span className="line-clamp-2">
                            {reader.displayName}
                          </span>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            @{reader.username}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
