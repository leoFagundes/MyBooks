import { expect, test } from "@playwright/test";

test.describe("capas, lombadas e prateleira", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev");
  });

  test("livro sem capa mostra a capa tipográfica com o título", async ({
    page,
  }) => {
    const cover = page.getByTestId("capa-a-paixao-segundo-gh");
    await cover.scrollIntoViewIfNeeded();
    await expect(cover).toHaveAttribute("data-cover", "generated");
    await expect(cover).toContainText("A Paixão Segundo G.H.");
  });

  test("capa que não carrega cai na tipográfica", async ({ page }) => {
    const cover = page.getByTestId("capa-quarto-de-despejo");
    await cover.scrollIntoViewIfNeeded();
    await expect(cover).toHaveAttribute("data-cover", "generated");
    await expect(cover).toContainText("Quarto de Despejo");
  });

  test("capa real aparece como imagem", async ({ page }) => {
    const cover = page.getByTestId("capa-torto-arado");
    await cover.scrollIntoViewIfNeeded();
    await expect(cover).toHaveAttribute("data-cover", "image");
    await expect(
      cover.getByRole("img", { name: "Capa de Torto Arado" }),
    ).toBeVisible();
  });

  test("a prateleira mostra uma lombada por livro", async ({ page }) => {
    const shelf = page.getByRole("list", { name: "Prateleira" });
    await expect(shelf.getByRole("listitem")).toHaveCount(15);
  });

  test("lombada com foco levanta, como no hover", async ({ page }) => {
    const spine = page
      .getByRole("list", { name: "Prateleira" })
      .getByRole("link", { name: /Torto Arado/ });
    await spine.focus();
    await expect(spine).toHaveAttribute("data-lifted", "true");
  });
});
