import { expect, test } from "@playwright/test";
import { presetTheme, trackPageErrors } from "./helpers";

test.describe("tema", () => {
  test("aplica o tema salvo antes do React carregar", async ({ page }) => {
    await presetTheme(page, "dark");
    // Sem os chunks de JS o React nunca hidrata: só o script inline pode agir.
    await page.route("**/_next/static/**/*.js", (route) => route.abort());
    await page.goto("/dev");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("alterna o tema e lembra a escolha no reload", async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/dev");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");

    await page.getByRole("button", { name: "Usar tema escuro" }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Usar tema claro" }).click();
    await expect(html).toHaveAttribute("data-theme", "light");
    expect(errors).toEqual([]);
  });

  test("sem escolha salva, segue o tema do sistema", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/dev");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
