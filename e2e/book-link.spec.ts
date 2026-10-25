import { expect, test, type Locator, type Page } from "@playwright/test";

// Aperta sem soltar: marca a origem da viagem sem navegar
async function press(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  await target.hover();
  await page.mouse.down();
}

async function releaseElsewhere(page: Page) {
  await page.mouse.move(2, 2);
  await page.mouse.up();
}

test.describe("origem da viagem da capa", () => {
  test("só a capa apertada vira origem, mesmo com o livro repetido na página", async ({
    page,
  }) => {
    await page.goto("/dev");
    await page
      .getByRole("radiogroup", { name: "Visualização" })
      .getByRole("radio", { name: "Grade" })
      .click();
    const gridCover = page
      .getByRole("list", { name: "Grade de capas" })
      .getByRole("link", { name: "Torto Arado" });
    const shelfSpine = page
      .getByRole("list", { name: "Prateleira" })
      .getByRole("link", { name: /Torto Arado/ });

    await press(page, gridCover);
    await expect(gridCover).toHaveAttribute("data-transition-source", "true");
    await expect(shelfSpine).not.toHaveAttribute("data-transition-source");
    await releaseElsewhere(page);

    // Uma origem por vez no app inteiro: a nova tira a anterior
    await press(page, shelfSpine);
    await expect(shelfSpine).toHaveAttribute("data-transition-source", "true");
    await expect(gridCover).not.toHaveAttribute("data-transition-source");
    await releaseElsewhere(page);
  });

  test("Enter na lombada focada também marca a origem", async ({ page }) => {
    await page.goto("/dev");
    const spine = page
      .getByRole("list", { name: "Prateleira" })
      .getByRole("link", { name: /Dom Casmurro/ });
    await spine.focus();
    // Só o keydown: o teste não precisa navegar
    await page.keyboard.down("Enter");
    await expect(spine).toHaveAttribute("data-transition-source", "true");
  });
});
