"use client";

import {
  AnimatePresence,
  motion,
  useAnimate,
  useReducedMotion,
} from "motion/react";
import { useEffect } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { durations, easing, springs, tweens } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  estanteItem,
  NavLinks,
  type NavViewer,
  useNavIndicator,
} from "./nav-links";
import { useShelfSignal } from "./shelf-flight";

/**
 * "Minha estante": vai para o perfil de quem está vendo, ou para o Entrar.
 * É o alvo da capa copiada: dá um pulinho quando ela chega e mostra por um
 * instante o novo total (spec §3, momento 6).
 */
export function EstanteLink({
  viewer,
  variant,
  target = true,
}: {
  viewer: NavViewer | null;
  variant: "top" | "pill";
  /** As barras de vitrine do /dev não recebem a capa. */
  target?: boolean;
}) {
  const indicatorId = useNavIndicator();
  const { bump, count } = useShelfSignal();
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    if (bump === 0 || reduced) return;
    void animate(
      scope.current,
      { y: [0, -5, 0] },
      { duration: durations.base, ease: easing },
    );
  }, [bump, reduced, animate, scope]);

  return (
    <span
      ref={scope}
      data-shelf-target={target ? "" : undefined}
      className="relative inline-flex"
    >
      <NavLinks
        items={[estanteItem(viewer)]}
        indicatorId={indicatorId}
        variant={variant}
      />
      <AnimatePresence>
        {count !== null ? (
          <motion.span
            key="contador"
            aria-hidden
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: tweens.fast }}
            transition={springs.snappy}
            className={cn(
              "pointer-events-none absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] leading-none text-primary-foreground",
              variant === "top" ? "-top-1.5 -right-1.5" : "top-0.5 right-0.5",
            )}
          >
            <AnimatedNumber value={count} />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
