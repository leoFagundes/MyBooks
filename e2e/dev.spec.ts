import { expect, test } from "@playwright/test";
import { trackPageErrors } from "./helpers";

test.describe("vitrine /dev", () => {
  for (const path of ["/", "/dev"] as const) {
    test(`${path} carrega sem erros de console nem de página`, async ({
      page,
    }) => {
      const errors = trackPageErrors(page);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(errors).toEqual([]);
    });
  }

  test("as visualizações trocam entre Estante, Grade e Lista", async ({
    page,
  }) => {
    await page.goto("/dev");
    const switcher = page.getByRole("radiogroup", { name: "Visualização" });
    await expect(page.getByRole("list", { name: "Estante" })).toBeVisible();

    await switcher.getByRole("radio", { name: "Grade" }).click();
    const grid = page.getByRole("list", { name: "Grade de capas" });
    await expect(grid).toBeVisible();
    await expect(
      grid.getByRole("img", { name: "Capa de Torto Arado" }),
    ).toBeVisible();
    await expect(page.getByRole("list", { name: "Estante" })).toHaveCount(0);

    await switcher.getByRole("radio", { name: "Lista" }).click();
    const table = page.getByRole("table", { name: "Lista de livros" });
    await expect(table).toBeVisible();
    await expect(table.getByRole("row", { name: /Torto Arado/ })).toBeVisible();
  });

  test("Copiar livro mostra o toast com Desfazer", async ({ page }) => {
    await page.goto("/dev");
    await page.getByRole("button", { name: "Copiar livro" }).click();
    const toast = page
      .getByRole("listitem")
      .filter({ hasText: "Na sua estante" });
    await expect(toast).toBeVisible();
    await expect(toast.getByRole("button", { name: "Desfazer" })).toBeVisible();
  });

  test("o contador anima para o novo número", async ({ page }) => {
    await page.goto("/dev");
    const books = page.getByTestId("contador-livros");
    // innerText: o NumberFlow deixa o HTML do servidor fora da tela, no light DOM
    await expect(books).toHaveText("128 livros", { useInnerText: true });
    await page.getByRole("button", { name: "Somar um livro" }).click();
    await expect(books).toHaveText("129 livros", { useInnerText: true });
    // Os dígitos animados são só visuais; o leitor de tela lê o texto puro
    await expect(books.locator("number-flow-react")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
