import type { Page } from "@playwright/test";

/** Junta erros de console e exceções da página para o teste conferir no fim. */
export function trackPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

export const THEME_STORAGE_KEY = "mybooks:tema";

/** Salva a preferência de tema antes de qualquer script da página rodar. */
export async function presetTheme(page: Page, preference: string) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [THEME_STORAGE_KEY, preference] as const,
  );
}
