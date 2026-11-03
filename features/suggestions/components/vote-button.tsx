"use client";

import { ChevronUp } from "lucide-react";
import { motion, useAnimationControls } from "motion/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { springs, tweens } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { toggleVote } from "../actions";

/**
 * O voto numa sugestão (um por pessoa), com o número do NumberFlow e o "pop"
 * da seta. Aparece na hora e volta atrás se o servidor recusar.
 */
export function VoteButton({
  suggestionId,
  votes,
  voted,
  signedIn,
  onSignIn,
  size = "md",
}: {
  suggestionId: string;
  votes: number;
  voted: boolean;
  signedIn: boolean;
  onSignIn: () => void;
  size?: "sm" | "md";
}) {
  const [state, setState] = useState({ votes, voted });
  const [, startTransition] = useTransition();
  const controls = useAnimationControls();

  function toggle() {
    if (!signedIn) {
      onSignIn();
      return;
    }
    const on = !state.voted;
    const previous = state;
    setState({ voted: on, votes: state.votes + (on ? 1 : -1) });
    if (on) {
      void controls
        .start({ y: -3, scale: 1.2, transition: tweens.fast })
        .then(() =>
          controls.start({ y: 0, scale: 1, transition: springs.gentle }),
        );
    }
    startTransition(async () => {
      const result = await toggleVote(suggestionId, on);
      if (!result.ok) {
        setState(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={state.voted}
      aria-label={`${state.voted ? "Tirar o voto" : "Votar"}: ${state.votes} ${state.votes === 1 ? "voto" : "votos"}`}
      className={cn(
        "flex shrink-0 cursor-pointer flex-col items-center justify-center rounded-control border font-mono transition-colors",
        size === "md" ? "h-16 w-14 gap-0.5 text-base" : "h-12 w-11 text-sm",
        state.voted
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-surface text-foreground hover:bg-muted",
      )}
    >
      <motion.span animate={controls} className="inline-flex">
        <ChevronUp className="size-4" strokeWidth={1.5} aria-hidden />
      </motion.span>
      <span aria-hidden>
        <AnimatedNumber value={state.votes} />
      </span>
    </button>
  );
}
