import { expect, test, type Page } from "@playwright/test";
import { trackPageErrors, waitForHydration } from "./helpers";

const section = (page: Page) => page.getByRole("region", { name: "Coleções" });

const classicsCard = (page: Page) =>
  section(page).getByRole("link", { name: "Clássicos brasileiros" });

// Antes de hidratar, o clique no card seguiria o link
async function openSection(page: Page) {
  await page.goto("/dev#colecoes");
  await waitForHydration(classicsCard(page));
}

test.describe("coleções na vitrine", () => {
  test("cards com título, contagem e link para a página", async ({ page }) => {
    const errors = trackPageErrors(page);
    await openSection(page);
    await expect(classicsCard(page)).toHaveAttribute(
      "href",
      "/dev/colecao/classicos-brasileiros",
    );
    await expect(section(page).getByText("8 livros")).toBeVisible();
    await expect(section(page).getByRole("link")).toHaveCount(3);
    expect(errors).toEqual([]);
  });

  test("o leque abre no hover e no foco", async ({ page }) => {
    await openSection(page);
    const fan = section(page).getByTestId("leque-classicos-brasileiros");
    await expect(fan).toHaveAttribute("data-open", "false");
    await classicsCard(page).hover();
    await expect(fan).toHaveAttribute("data-open", "true");
    await page.mouse.move(0, 0);
    await expect(fan).toHaveAttribute("data-open", "false");
    await classicsCard(page).focus();
    await expect(fan).toHaveAttribute("data-open", "true");
  });

  test("o clique abre a espiada; Esc fecha e o foco volta ao card", async ({
    page,
  }) => {
    await openSection(page);
    await classicsCard(page).click();
    const peek = page.getByRole("dialog", { name: "Clássicos brasileiros" });
    await expect(peek).toBeVisible();
    await expect(
      peek.getByText("Os livros que explicam o Brasil"),
    ).toBeVisible();
    await expect(
      peek.getByRole("link", { name: "Abrir coleção" }),
    ).toHaveAttribute("href", "/dev/colecao/classicos-brasileiros");
    await page.keyboard.press("Escape");
    await expect(peek).toBeHidden();
    await expect(classicsCard(page)).toBeFocused();
  });

  test("a coleção vazia mostra o emoji no lugar das capas", async ({
    page,
  }) => {
    await openSection(page);
    await expect(
      section(page).getByTestId("leque-para-ler-devagar"),
    ).toHaveText("🍵");
    await expect(section(page).getByText("Nenhum livro ainda")).toBeVisible();
  });

  test("com movimento reduzido o leque não abre", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openSection(page);
    await classicsCard(page).hover();
    await expect(
      section(page).getByTestId("leque-classicos-brasileiros"),
    ).toHaveAttribute("data-open", "false");
  });
});
