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

/**
 * Abre a paleta com Ctrl+K. Na primeira visita o dev server ainda pode estar
 * hidratando a página, e a tecla se perde: tenta de novo até a paleta abrir.
 */
export async function openCommandPalette(page: Page) {
  const palette = page.getByRole("dialog", { name: "Paleta de comandos" });
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.keyboard.press("Control+K");
    try {
      await palette.waitFor({ state: "visible", timeout: 2000 });
      return palette;
    } catch {
      // ainda hidratando; tenta de novo
    }
  }
  throw new Error("A paleta de comandos não abriu com Ctrl+K");
}

export const THEME_STORAGE_KEY = "mybooks:tema";

/** Salva a preferência de tema antes de qualquer script da página rodar. */
export async function presetTheme(page: Page, preference: string) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [THEME_STORAGE_KEY, preference] as const,
  );
}
