import { expect, test } from "@playwright/test";

test.describe("topo da página do livro", () => {
  test("mostra capa, título, autor e metadados em mono", async ({ page }) => {
    await page.goto("/dev/livro/torto-arado");
    await expect(
      page.getByRole("heading", { level: 1, name: "Torto Arado" }),
    ).toBeVisible();
    await expect(page.getByText("Itamar Vieira Junior")).toBeVisible();
    await expect(page.getByText("2019 · 280 páginas")).toBeVisible();
    await expect(
      page.getByRole("img", { name: "Capa de Torto Arado" }),
    ).toBeVisible();
  });

  test("ler mais abre a sinopse inteira e vira ler menos", async ({ page }) => {
    // Numa coluna estreita a sinopse passa das 4 linhas em qualquer projeto
    await page.setViewportSize({ width: 600, height: 900 });
    await page.goto("/dev/livro/grande-sertao-veredas");
    const more = page.getByRole("button", { name: "ler mais" });
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await more.click();
    const less = page.getByRole("button", { name: "ler menos" });
    await expect(less).toHaveAttribute("aria-expanded", "true");
  });

  // O slug só chega dentro do Suspense: o status já saiu como 200 quando o
  // notFound roda, então o teste olha a página de não encontrado em si
  test("livro que não existe mostra a página de não encontrado", async ({
    page,
  }) => {
    await page.goto("/dev/livro/nao-existe");
    await expect(
      page.getByRole("heading", { name: "Essa página não está na estante." }),
    ).toBeVisible();
  });
});
