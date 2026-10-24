import { expect, test } from "@playwright/test";
import { trackPageErrors } from "./helpers";

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

  // O servidor não sabe da preferência: o HTML nasce no estado inicial completo
  // e, com movimento reduzido, posição e desfoque precisam chegar ao fim
  test("com movimento reduzido, as entradas terminam nítidas e no lugar", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dev");
    const item = page.getByTestId("entrada-1");
    await item.scrollIntoViewIfNeeded();
    const word = page
      .getByText("Sua vida de leitor, em uma estante só.")
      .locator("span.inline-block")
      .first();
    await word.scrollIntoViewIfNeeded();
    for (const entered of [item, word]) {
      await expect(entered).toHaveCSS("opacity", "1");
      await expect(entered).toHaveCSS("filter", /^(none|blur\(0px\))$/);
      await expect(entered).toHaveCSS(
        "transform",
        /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/,
      );
    }
    expect(errors).toEqual([]);
  });

  test("o texto do botão troca de Seguir para Seguindo", async ({ page }) => {
    await page.goto("/dev");
    const button = page.getByRole("button", { name: "Seguir" });
    await button.click();
    await expect(page.getByRole("button", { name: "Seguindo" })).toBeVisible();
  });
});
