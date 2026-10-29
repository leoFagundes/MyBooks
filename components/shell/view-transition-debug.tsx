"use client";

import { useEffect } from "react";

const TO_BOOK = ["livro-capa", "livro-lombada"];
const BACK = "livro-volta";

/** Os nomes que ganharam ::view-transition-group nesta transição. */
function groupNames() {
  return document
    .getAnimations()
    .map(
      (animation) =>
        (animation.effect as KeyframeEffect | null)?.pseudoElement ?? "",
    )
    .filter((pseudo) => pseudo.startsWith("::view-transition-group("))
    .map((pseudo) => pseudo.slice(pseudo.indexOf("(") + 1, -1));
}

/**
 * Só no dev: conta no console quando uma View Transition é pulada (e por
 * quê), quando começa outra antes de a anterior terminar e quando a capa não
 * forma par na ida ou na volta. Sem par, a capa só esmaece com a página.
 */
export function ViewTransitionDebug() {
  useEffect(() => {
    const original = document.startViewTransition?.bind(document);
    if (!original) return;
    let running: ViewTransition | null = null;

    document.startViewTransition = ((
      arg?: ViewTransitionUpdateCallback | StartViewTransitionOptions,
    ) => {
      const types =
        arg && typeof arg === "object" && "types" in arg
          ? [...(arg.types ?? [])]
          : [];
      const label = types.length > 0 ? `[${types.join(", ")}]` : "[sem tipo]";
      if (running) {
        console.warn(
          `[transição] ${label} começou antes de a anterior terminar: a anterior pulou para o fim`,
        );
      }
      const transition = original(arg as StartViewTransitionOptions);
      running = transition;
      void transition.finished.finally(() => {
        if (running === transition) running = null;
      });

      transition.ready
        .then(() => {
          const traveled = groupNames().some((name) =>
            name.startsWith("capa-"),
          );
          if (traveled) return;
          if (types.some((type) => TO_BOOK.includes(type))) {
            console.warn(
              `[transição] ${label} a capa não viajou: a página do livro não mostrava a capa na hora da foto`,
            );
          } else if (types.includes(BACK)) {
            console.warn(
              `[transição] ${label} a capa não voltou: a origem não mostrava a capa nem um esqueleto com o <ReturningCover /> (ou a capa saiu dela)`,
            );
          }
        })
        .catch((error: unknown) => {
          const reason =
            error instanceof Error ? `${error.name}: ${error.message}` : error;
          console.warn(`[transição] ${label} pulada: ${String(reason)}`);
        });
      return transition;
    }) as typeof document.startViewTransition;

    return () => {
      document.startViewTransition = original;
    };
  }, []);

  return null;
}
