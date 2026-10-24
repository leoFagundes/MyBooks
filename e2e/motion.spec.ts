import { expect, test } from "@playwright/test";

test.describe("movimento", () => {
  test("a rolagem suave (Lenis) liga com movimento normal", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/dev");
    await expect(page.locator("html")).toHaveClass(/\blenis\b/);
  });

  test("com movimento reduzido, o Lenis fica desligado", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dev");
    await expect(
      page.getByRole("heading", { name: "Movimento", exact: true }),
    ).toBeVisible();
    await expect(page.locator("html")).not.toHaveClass(/\blenis\b/);
  });

  test("os itens entram uma vez e terminam visíveis", async ({ page }) => {
    await page.goto("/dev");
    const item = page.getByTestId("entrada-1");
    await item.scrollIntoViewIfNeeded();
    await expect(item).toHaveCSS("opacity", "1");
  });

  test("o texto do botão troca de Seguir para Seguindo", async ({ page }) => {
    await page.goto("/dev");
    const button = page.getByRole("button", { name: "Seguir" });
    await button.click();
    await expect(page.getByRole("button", { name: "Seguindo" })).toBeVisible();
  });
});
