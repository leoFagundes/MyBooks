import { expect, test } from "@playwright/test";
import { openCommandPalette, trackPageErrors } from "./helpers";

test.describe("navegação", () => {
  test("Ctrl+K abre a paleta, filtra e alterna o tema", async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/dev");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");

    const palette = await openCommandPalette(page);

    await page.keyboard.type("tema");
    await expect(
      palette.getByRole("option", { name: /Alternar tema/ }),
    ).toBeVisible();
    await expect(
      palette.getByRole("option", { name: /Componentes/ }),
    ).toHaveCount(0);

    await page.keyboard.press("Enter");
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(palette).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("Esc fecha a paleta", async ({ page }) => {
    await page.goto("/dev");
    const palette = await openCommandPalette(page);
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();
  });

  test("no celular, pílula inferior; no desktop, links na barra superior", async ({
    page,
  }, testInfo) => {
    await page.goto("/dev");
    const top = page.getByRole("navigation", { name: "Navegação principal" });
    const bottom = page.getByRole("navigation", {
      name: "Navegação no celular",
    });

    if (testInfo.project.name === "mobile") {
      await expect(bottom).toBeVisible();
      await expect(top).toBeHidden();
    } else {
      await expect(top).toBeVisible();
      await expect(bottom).toBeHidden();
    }
  });
});
