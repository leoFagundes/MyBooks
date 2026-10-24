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

  test("a paleta devolve o foco ao botão Buscar ao fechar", async ({
    page,
  }) => {
    await page.goto("/dev");
    const search = page.getByRole("button", { name: "Buscar", exact: true });
    const palette = page.getByRole("dialog", { name: "Paleta de comandos" });
    // O primeiro clique pode chegar antes da hidratação
    await expect(async () => {
      await search.click();
      await expect(palette).toBeVisible({ timeout: 2000 });
    }).toPass();
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();
    await expect(search).toBeFocused();
  });

  test("aberta pelo Ctrl+K, a paleta devolve o foco a quem estava focado", async ({
    page,
  }) => {
    await page.goto("/dev");
    const logo = page.getByRole("link", { name: "MyBooks, página inicial" });
    await logo.focus();
    const palette = await openCommandPalette(page);
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();
    await expect(logo).toBeFocused();
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
