"use client";

import { Heart, Lightbulb } from "lucide-react";
import { motion, useAnimationControls } from "motion/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { springs, tweens } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/action";
import type { ReactionKind } from "../types";

const COPY = {
  like: { icon: Heart, label: "Curtir", done: "Curtido" },
  useful: { icon: Lightbulb, label: "Útil", done: "Marcado como útil" },
} as const;

/**
 * Curtir ou "útil", com o número e o "pop" (MELHORIAS 8): a reação aparece
 * na hora e volta atrás se o servidor recusar. Sem conta, leva a entrar.
 */
export function ReactionButton({
  kind,
  count,
  active,
  onToggle,
  signedIn,
  onSignIn,
}: {
  kind: ReactionKind;
  count: number;
  active: boolean;
  onToggle: (on: boolean) => Promise<ActionResult>;
  signedIn: boolean;
  onSignIn: () => void;
}) {
  const [state, setState] = useState({ active, count });
  const [, startTransition] = useTransition();
  const controls = useAnimationControls();
  const { icon: Icon, label, done } = COPY[kind];

  function toggle() {
    if (!signedIn) {
      onSignIn();
      return;
    }
    const on = !state.active;
    const previous = state;
    setState({ active: on, count: state.count + (on ? 1 : -1) });
    if (on) {
      // O "pop": cresce rápido e volta com a mola de rebote (mola só aceita
      // dois quadros-chave, por isso em dois tempos)
      void controls
        .start({ scale: 1.35, transition: tweens.fast })
        .then(() => controls.start({ scale: 1, transition: springs.gentle }));
    }
    startTransition(async () => {
      const result = await onToggle(on);
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
      aria-pressed={state.active}
      aria-label={`${state.active ? done : label}: ${state.count}`}
      className={cn(
        "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
        state.active
          ? "border-foreground text-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      <motion.span animate={controls} className="inline-flex">
        <Icon
          className={cn(
            "size-4",
            state.active && kind === "like" && "fill-accent text-accent",
          )}
          strokeWidth={1.5}
          aria-hidden
        />
      </motion.span>
      <span aria-hidden>
        <AnimatedNumber value={state.count} />
      </span>
    </button>
  );
}
