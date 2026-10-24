import { expect, test, type Locator, type Page } from "@playwright/test";
import { openCommandPalette } from "./helpers";

// Com uma sobreposição aberta, a roda do mouse não pode rolar a página por
// trás, nem quando o Lenis está ligado.
test.describe("a página não rola atrás das sobreposições", () => {
  test.skip(({ isMobile }) => isMobile, "roda do mouse: projeto desktop");

  const overlays: [string, (page: Page) => Promise<Locator>][] = [
    [
      "o modal aberto",
      async (page) => {
        await page.getByRole("button", { name: "Remover da estante" }).click();
        return page.getByRole("dialog", { name: "Remover da estante?" });
      },
    ],
    [
      "a gaveta aberta",
      async (page) => {
        await page.getByRole("button", { name: "Abrir filtros" }).click();
        return page.getByRole("dialog", { name: "Filtros" });
      },
    ],
    ["a paleta de comandos aberta", (page) => openCommandPalette(page)],
  ];

  for (const [name, open] of overlays) {
    test(`com ${name}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto("/dev");
      await expect(page.locator("html")).toHaveClass(/\blenis\b/);
      const overlay = await open(page);
      await expect(overlay).toBeVisible();
      const before = await page.evaluate(() => window.scrollY);

      // Sobre o fundo escurecido e sobre a própria sobreposição
      const box = await overlay.boundingBox();
      if (!box) throw new Error(`${name} sem caixa`);
      for (const [x, y] of [
        [8, 160],
        [box.x + box.width / 2, box.y + 24],
      ]) {
        await page.mouse.move(x, y);
        await page.mouse.wheel(0, 1200);
      }
      await page.waitForTimeout(800);
      expect(await page.evaluate(() => window.scrollY)).toBe(before);

      // Fechou, a página volta a rolar
      await page.keyboard.press("Escape");
      await expect(overlay).toBeHidden();
      await page.mouse.move(8, 160);
      await page.mouse.wheel(0, 600);
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThan(before);
    });
  }
});
