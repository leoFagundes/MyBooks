import { expect, type Locator, type Page } from "@playwright/test";

// A vitrine tem uma capa quebrada de propósito, para mostrar o fallback.
const EXPECTED_BROKEN = ["/capas/nao-existe.jpg"];

/**
 * Espera o React hidratar o elemento. Antes disso a página é só HTML: o
 * clique num card segue o link em vez de abrir a espiada, e botões ainda
 * não respondem. Com a máquina ocupada, a hidratação do dev demora.
 */
export async function waitForHydration(target: Locator) {
  await expect
    .poll(
      () =>
        target.evaluate((element) =>
          Object.keys(element).some((key) => key.startsWith("__reactFiber")),
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
}

/** Junta erros de console e exceções da página para o teste conferir no fim. */
export function trackPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const url = message.location().url;
    if (EXPECTED_BROKEN.some((path) => url.includes(path))) return;
    errors.push(message.text());
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
