"use client";

import { motion } from "motion/react";
import { useState, useSyncExternalStore, ViewTransition } from "react";
import { tweens } from "@/lib/motion";

const subscribe = () => () => {};
const supportsViewTransitions = () => "startViewTransition" in document;

/**
 * Conteúdo da página que sai e entra nas navegações (View Transitions do
 * React, classes `pagina-sai` e `pagina-entra` no globals.css). Vai em cada
 * page.tsx: o layout persiste entre as rotas e nunca sai nem entra.
 * Sem View Transitions no navegador, a página nova chega com fade do Motion.
 */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // Na hidratação valem os valores do servidor: a primeira carga não anima
  const supported = useSyncExternalStore(
    subscribe,
    supportsViewTransitions,
    () => true,
  );
  const hydrating = useSyncExternalStore(
    subscribe,
    () => false,
    () => true,
  );
  const [firstLoad] = useState(hydrating);

  if (supported || firstLoad) {
    return (
      <ViewTransition enter="pagina-entra" exit="pagina-sai" default="none">
        <div className={className}>{children}</div>
      </ViewTransition>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={tweens.base}
    >
      {children}
    </motion.div>
  );
}
