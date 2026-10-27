"use client";

import { useEffect, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { SwapText } from "@/components/motion/swap-text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { followReader, unfollowReader } from "@/features/social/actions";
import type { SuggestedReader } from "@/features/social/types";
import { initials } from "@/lib/initials";
import { finishOnboarding } from "../../actions";
import { genreLabel, type GenreSlug } from "../../genres";
import { StepFrame } from "./step-frame";

export type FollowState = "none" | "accepted" | "pending";

type Suggestions =
  | { state: "loading" }
  | { state: "done"; readers: SuggestedReader[] }
  | { state: "error" };

function useSuggestions(): Suggestions {
  const [suggestions, setSuggestions] = useState<Suggestions>({
    state: "loading",
  });
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/readers/suggestions", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<{ readers: SuggestedReader[] }>;
      })
      .then(({ readers }) => setSuggestions({ state: "done", readers }))
      .catch(() => {
        if (!controller.signal.aborted) setSuggestions({ state: "error" });
      });
    return () => controller.abort();
  }, []);
  return suggestions;
}

const list = new Intl.ListFormat("pt-BR", { type: "conjunction" });

// "Também lê Clássicos e Contos"; sem gênero em comum, o que a pessoa lê
function tasteLine(reader: SuggestedReader, genres: GenreSlug[]) {
  const shared = reader.favoriteGenres.filter((genre) =>
    (genres as string[]).includes(genre),
  );
  const labels = (shared.length > 0 ? shared : reader.favoriteGenres)
    .slice(0, 3)
    .map(genreLabel)
    .filter((label): label is string => label !== null);
  if (labels.length === 0) return null;
  return `${shared.length > 0 ? "Também lê" : "Lê"} ${list.format(labels)}`;
}

function FollowButton({
  reader,
  state,
  onChange,
}: {
  reader: SuggestedReader;
  state: FollowState;
  onChange: (state: FollowState) => void;
}) {
  const [optimistic, setOptimistic] = useOptimistic(state);
  const [, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      if (optimistic === "none") {
        setOptimistic(reader.isPrivate ? "pending" : "accepted");
        const result = await followReader(reader.id);
        if (result.ok) onChange(result.data.status);
        else toast.error(result.error);
        return;
      }
      setOptimistic("none");
      const result = await unfollowReader(reader.id);
      if (result.ok) onChange("none");
      else toast.error(result.error);
    });
  }

  const label =
    optimistic === "accepted"
      ? "Seguindo"
      : optimistic === "pending"
        ? "Solicitado"
        : "Seguir";
  return (
    <Button
      type="button"
      size="sm"
      variant={optimistic === "none" ? "primary" : "outline"}
      onClick={toggle}
      aria-label={`${label} @${reader.username}`}
      className="min-w-24"
    >
      <SwapText text={label} />
    </Button>
  );
}

export function ReadersStep({
  genres,
  follows,
  onChange,
  onBack,
}: {
  genres: GenreSlug[];
  follows: Record<string, FollowState>;
  onChange: React.Dispatch<React.SetStateAction<Record<string, FollowState>>>;
  onBack: () => void;
}) {
  const suggestions = useSuggestions();
  const [error, setError] = useState<string | null>(null);
  const [finishing, startFinishing] = useTransition();

  function finish() {
    setError(null);
    startFinishing(async () => {
      const result = await finishOnboarding();
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <StepFrame
      title="Leitores para seguir"
      description="Gente que gosta do que você gosta. Seguir põe as leituras dessas pessoas no seu início."
      focusTitle
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onBack}>
            Voltar
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={finish}
            disabled={finishing}
            aria-busy={finishing}
          >
            <SwapText text={finishing ? "Concluindo…" : "Concluir"} />
          </Button>
        </>
      }
    >
      <div className="flex min-h-48 flex-col gap-3">
        {suggestions.state === "loading" ? (
          <div
            aria-busy
            aria-label="Buscando leitores"
            className="flex flex-col gap-4"
          >
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : suggestions.state === "error" ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            As sugestões não carregaram agora. Você pode encontrar leitores
            depois, no Explorar.
          </p>
        ) : suggestions.readers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Ainda não achamos leitores com o seu gosto. No Explorar tem mais
            gente.
          </p>
        ) : (
          <ul
            aria-label="Leitores sugeridos"
            className="flex flex-col divide-y divide-border"
          >
            {suggestions.readers.map((reader) => {
              const taste = tasteLine(reader, genres);
              return (
                <li key={reader.id} className="flex items-center gap-3 py-3">
                  <Avatar className="size-10">
                    {reader.avatarUrl ? (
                      <AvatarImage src={reader.avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback>
                      {initials(reader.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {reader.displayName}{" "}
                      <span className="font-mono text-xs font-normal text-muted-foreground">
                        @{reader.username}
                      </span>
                    </span>
                    {taste ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {taste}
                      </span>
                    ) : null}
                  </div>
                  <FollowButton
                    reader={reader}
                    state={follows[reader.id] ?? "none"}
                    onChange={(state) =>
                      onChange((current) => ({
                        ...current,
                        [reader.id]: state,
                      }))
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </StepFrame>
  );
}
