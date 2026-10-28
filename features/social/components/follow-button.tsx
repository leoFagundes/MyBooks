"use client";

import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { SwapText } from "@/components/motion/swap-text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { followReader, unfollowReader } from "../actions";
import { asFollowState } from "../lib/follow-state";
import type { FollowState, ReaderState } from "../types";

type FollowButtonProps = {
  reader: { id: string; username: string; isPrivate: boolean };
  state: ReaderState;
  size?: "sm" | "md";
  /** Para quem guarda o estado fora (o onboarding, entre os passos). */
  onChange?: (state: FollowState) => void;
  className?: string;
};

function labelOf(state: FollowState, isPrivate: boolean) {
  if (state === "accepted") return "Seguindo";
  if (state === "pending") return "Pedido enviado";
  return isPrivate ? "Pedir para seguir" : "Seguir";
}

/**
 * Seguir (spec §5.4): "Seguir" → "Seguindo", ou, no perfil privado, "Pedir
 * para seguir" → "Pedido enviado", na hora e com o texto trocando em
 * popLayout. Deixar de seguir um perfil privado pede confirmação.
 */
export function FollowButton({
  reader,
  state,
  size = "md",
  onChange,
  className,
}: FollowButtonProps) {
  // O servidor manda a relação de novo depois de cada ação; até lá vale a
  // resposta da própria ação
  const [confirmed, setConfirmed] = useState(asFollowState(state));
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    setConfirmed(asFollowState(state));
  }
  const [optimistic, setOptimistic] = useOptimistic(confirmed);
  const [, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  if (state === "self") return null;
  if (state === "visitor") {
    return (
      <Button asChild size={size} className={cn("min-w-24", className)}>
        <Link href={routes.entrar}>Seguir</Link>
      </Button>
    );
  }

  function settle(next: FollowState) {
    setConfirmed(next);
    onChange?.(next);
  }

  function follow() {
    startTransition(async () => {
      setOptimistic(reader.isPrivate ? "pending" : "accepted");
      const result = await followReader(reader.id);
      if (result.ok) settle(result.data.status);
      else toast.error(result.error);
    });
  }

  function unfollow() {
    startTransition(async () => {
      setOptimistic("none");
      const result = await unfollowReader(reader.id);
      if (result.ok) settle("none");
      else toast.error(result.error);
    });
  }

  function toggle() {
    if (optimistic === "none") follow();
    else if (optimistic === "accepted" && reader.isPrivate) setConfirming(true);
    else unfollow();
  }

  const label = labelOf(optimistic, reader.isPrivate);

  return (
    <>
      <Button
        ref={button}
        type="button"
        size={size}
        variant={optimistic === "none" ? "primary" : "outline"}
        onClick={toggle}
        aria-label={`${label} @${reader.username}`}
        className={cn(size === "sm" ? "min-w-24" : "min-w-28", className)}
      >
        <SwapText text={label} />
      </Button>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          // Sem DialogTrigger, o foco volta ao botão à mão
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            button.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Deixar de seguir @{reader.username}?</DialogTitle>
            <DialogDescription>
              O perfil é privado: para ver a estante de novo, você vai precisar
              pedir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setConfirming(false);
                unfollow();
              }}
            >
              Deixar de seguir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
