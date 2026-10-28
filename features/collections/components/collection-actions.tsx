"use client";

import { BookmarkIcon, CopyIcon, HeartIcon, Share2Icon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { SwapText } from "@/components/motion/swap-text";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action";
import { springs } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Server Action que liga ou desliga (curtir, salvar), injetada pela página. */
type ToggleAction = (next: boolean) => Promise<ActionResult>;

/**
 * Curtir (spec §5.8): muda na hora (otimista) e volta atrás com um aviso
 * gentil se o servidor recusar. O coração estala de mola ao curtir.
 */
export function LikeButton({
  liked,
  count,
  onToggle,
}: {
  liked: boolean;
  count: number;
  onToggle: ToggleAction;
}) {
  const reduced = useReducedMotion() ?? false;
  const [state, setState] = useOptimistic({ liked, count });
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !state.liked;
    startTransition(async () => {
      setState({ liked: next, count: state.count + (next ? 1 : -1) });
      const result = await onToggle(next);
      if (!result.ok) toast("Não deu para curtir agora");
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      aria-label="Curtir"
      aria-pressed={state.liked}
      onClick={toggle}
    >
      <motion.span
        key={state.liked ? "curtiu" : "nao"}
        initial={state.liked && !reduced ? { scale: 0.6 } : false}
        animate={{ scale: 1 }}
        transition={springs.gentle}
        className="inline-flex"
      >
        <HeartIcon
          className={cn("size-4", state.liked && "fill-brand text-brand")}
        />
      </motion.span>
      <AnimatedNumber value={state.count} />
    </Button>
  );
}

/** Para quem não entrou: as curtidas, e o clique leva a entrar. */
export function LikeCountLink({ count }: { count: number }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={routes.entrar} aria-label="Entrar para curtir">
        <HeartIcon className="size-4" />
        <AnimatedNumber value={count} />
      </Link>
    </Button>
  );
}

/** Salvar a coleção para ver depois; só quem salvou vê que salvou. */
export function SaveButton({
  saved,
  onToggle,
}: {
  saved: boolean;
  onToggle: ToggleAction;
}) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !optimistic;
    startTransition(async () => {
      setOptimistic(next);
      const result = await onToggle(next);
      if (!result.ok) toast("Não deu para salvar agora");
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={optimistic}
      onClick={toggle}
    >
      <BookmarkIcon
        className={cn(
          "size-4",
          optimistic && "fill-foreground text-foreground",
        )}
      />
      <SwapText text={optimistic ? "Salva" : "Salvar"} />
    </Button>
  );
}

/**
 * Compartilhar: no celular, o compartilhar do sistema; no computador (ou se
 * ele falhar), copia o link.
 */
export function ShareButton({ path, title }: { path: Route; title: string }) {
  async function share() {
    const url = new URL(path, window.location.origin).href;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // Fechar o compartilhar não é erro
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copiado");
    } catch {
      toast("Não deu para copiar o link", { description: url });
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={share}>
      <Share2Icon className="size-4" />
      Compartilhar
    </Button>
  );
}

/**
 * Copiar a coleção para o próprio perfil. O botão trava enquanto copia (dois
 * cliques fazem uma cópia só) e o aviso leva até a cópia.
 */
export function CopyCollectionButton({
  onCopy,
  hrefFor = routes.collection,
}: {
  onCopy: () => Promise<ActionResult<{ id: string }>>;
  hrefFor?: (id: string) => Route;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function copy() {
    startTransition(async () => {
      const result = await onCopy();
      if (!result.ok) {
        toast("Não deu para copiar agora");
        return;
      }
      toast("Coleção copiada", {
        description: "Ela está no seu perfil, só para você por enquanto.",
        action: {
          label: "Abrir",
          onClick: () => router.push(hrefFor(result.data.id)),
        },
      });
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={copy}
    >
      <CopyIcon className="size-4" />
      Copiar coleção
    </Button>
  );
}
