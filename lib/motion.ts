import type { Transition, Variants } from "motion/react";

// Única fonte de movimento do app (spec §3). O CSS espelha `easing` e
// `durations` em app/globals.css, e tests/design-rules.test.ts confere.

export const springs = {
  snappy: { type: "spring", bounce: 0, visualDuration: 0.2 },
  smooth: { type: "spring", bounce: 0.15, visualDuration: 0.4 },
  gentle: { type: "spring", bounce: 0.25, visualDuration: 0.6 },
} as const satisfies Record<string, Transition>;

export const easing = [0.22, 1, 0.36, 1] as const;

/** Em segundos, como o Motion espera (150, 250 e 400ms). */
export const durations = { fast: 0.15, base: 0.25, slow: 0.4 } as const;

export const tweens = {
  fast: { duration: durations.fast, ease: easing },
  base: { duration: durations.base, ease: easing },
  slow: { duration: durations.slow, ease: easing },
} as const satisfies Record<string, Transition>;

export const staggerDelay = 0.035;

export const pressScale = 0.97;

/** Fade + 8px para cima + blur de 4px para 0. Reduzido: só opacidade. */
export function entranceVariants(reduced: boolean): Variants {
  if (reduced) {
    return { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  }
  return {
    hidden: { opacity: 0, y: 8, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
  };
}

/** Modais, popovers e paleta: entram de 0.96 com mola e saem mais rápido. */
export function overlayVariants(reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: tweens.base },
      exit: { opacity: 0, transition: tweens.fast },
    };
  }
  return {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1, transition: springs.smooth },
    exit: { opacity: 0, scale: 0.96, transition: tweens.fast },
  };
}

export type SheetSide = "bottom" | "right";

/** Gavetas deslizam para dentro da tela; com movimento reduzido só aparecem. */
export function sheetVariants(side: SheetSide, reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: tweens.base },
      exit: { opacity: 0, transition: tweens.fast },
    };
  }
  if (side === "bottom") {
    return {
      hidden: { y: "100%" },
      visible: { y: 0, transition: springs.smooth },
      exit: { y: "100%", transition: tweens.base },
    };
  }
  return {
    hidden: { x: "100%" },
    visible: { x: 0, transition: springs.smooth },
    exit: { x: "100%", transition: tweens.base },
  };
}
