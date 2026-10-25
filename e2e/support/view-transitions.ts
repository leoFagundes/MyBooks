import type { Page } from "@playwright/test";

export type RecordedAnimation = {
  pseudo: string;
  name: string;
  duration: number;
  delay: number;
};

export type RecordedTransition = {
  types: string[];
  animations: RecordedAnimation[];
  skipped?: string;
};

declare global {
  interface Window {
    __viewTransitions?: RecordedTransition[];
  }
}

/**
 * Registra cada View Transition da página: no `ready`, guarda os
 * pseudo-elementos animados (`::view-transition-new(capa-x)` etc.), o nome
 * da animação CSS, a duração e o atraso. Se nenhum par se forma, o
 * pseudo-elemento `old` ou `new` daquele nome simplesmente não aparece.
 */
export async function spyViewTransitions(page: Page) {
  await page.addInitScript(() => {
    const records: RecordedTransition[] = [];
    window.__viewTransitions = records;
    const original = document.startViewTransition?.bind(document);
    if (!original) return;
    document.startViewTransition = ((
      arg?: ViewTransitionUpdateCallback | StartViewTransitionOptions,
    ) => {
      const transition = original(arg as StartViewTransitionOptions);
      const types =
        arg && typeof arg === "object" && "types" in arg
          ? [...(arg.types ?? [])]
          : [];
      transition.ready
        .then(() => {
          const animations = document
            .getAnimations()
            .filter((animation) =>
              (
                animation.effect as KeyframeEffect | null
              )?.pseudoElement?.startsWith("::view-transition"),
            )
            .map((animation) => {
              const effect = animation.effect as KeyframeEffect;
              const timing = effect.getTiming();
              return {
                pseudo: effect.pseudoElement ?? "",
                name: (animation as CSSAnimation).animationName ?? "",
                duration: Number(timing.duration),
                delay: Number(timing.delay ?? 0),
              };
            });
          records.push({ types, animations });
        })
        .catch((error: unknown) => {
          records.push({ types, animations: [], skipped: String(error) });
        });
      return transition;
    }) as typeof document.startViewTransition;
  });
}

/** As transições registradas até agora. */
export async function recordedTransitions(
  page: Page,
): Promise<RecordedTransition[]> {
  return page.evaluate(() => window.__viewTransitions ?? []);
}

/** Espera a próxima transição registrada (depois de um clique, por exemplo). */
export async function nextTransition(
  page: Page,
  index: number,
): Promise<RecordedTransition> {
  await page.waitForFunction(
    (i) => (window.__viewTransitions?.length ?? 0) > i,
    index,
  );
  const all = await recordedTransitions(page);
  return all[index];
}
