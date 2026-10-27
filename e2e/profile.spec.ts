import { expect, type Page, test } from "@playwright/test";
import { trackPageErrors, waitForHydration } from "./helpers";
import {
  createTestUser,
  deleteTestUser,
  sessionCookies,
  type TestUser,
} from "./support/supabase-admin";

async function signInAs(page: Page, user: TestUser, baseURL?: string) {
  await page
    .context()
    .addCookies(await sessionCookies(user, { url: baseURL ?? "" }));
}

const sections = (page: Page) =>
  page.getByRole("navigation", { name: "Seções do perfil" });

test.describe("perfil", () => {
  test("/@ana abre o perfil com as abas e o indicador", async ({ page }) => {
    const errors = trackPageErrors(page);
    await page.goto("/@ana");

    await expect(
      page.getByRole("heading", { level: 1, name: "Ana Souza" }),
    ).toBeVisible();
    await expect(page.getByRole("main").getByText("@ana")).toBeVisible();
    await expect(
      page.getByText("Machado no ônibus, Clarice antes de dormir."),
    ).toBeVisible();
    // Contadores em mono, com o número para leitores de tela
    await expect(page.getByTestId("contador-livros")).toHaveText(
      /\d+\s+livros?/,
      {
        useInnerText: true,
      },
    );

    const tabs = sections(page);
    const shelf = tabs.getByRole("link", { name: "Estante" });
    const collections = tabs.getByRole("link", { name: "Coleções" });
    await expect(shelf).toHaveAttribute("aria-current", "page");
    await expect(shelf.getByTestId("aba-indicador")).toBeVisible();
    // A estante da Ana aparece (lombadas são links com título e autoria)
    await expect(
      page
        .getByRole("main")
        .getByRole("link", { name: /Dom Casmurro/ })
        .first(),
    ).toBeVisible();

    await waitForHydration(collections);
    await collections.click();
    await expect(page).toHaveURL(/\/@ana\/colecoes$/);
    await expect(collections).toHaveAttribute("aria-current", "page");
    await expect(collections.getByTestId("aba-indicador")).toBeVisible();
    await expect(shelf).not.toHaveAttribute("aria-current", "page");

    await tabs.getByRole("link", { name: "Citações" }).click();
    await expect(page).toHaveURL(/\/@ana\/citacoes$/);
    expect(errors).toEqual([]);
  });

  test("perfil privado de quem não sigo mostra só o cabeçalho", async ({
    page,
    baseURL,
  }) => {
    const user = await createTestUser({ onboarded: true });
    try {
      await signInAs(page, user, baseURL);
      await page.goto("/@caio");
      await expect(
        page.getByRole("heading", { level: 1, name: "Caio Andrade" }),
      ).toBeVisible();
      await expect(page.getByTestId("contador-livros")).toBeVisible();
      await expect(
        page.getByRole("main").getByText("Este perfil é privado"),
      ).toBeVisible();
      // Nada da estante, nem a troca de visualização
      await expect(
        page.getByRole("radiogroup", { name: "Visualização" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("main").getByRole("link", { name: /1984/ }),
      ).toHaveCount(0);

      await sections(page).getByRole("link", { name: "Citações" }).click();
      await expect(page).toHaveURL(/\/@caio\/citacoes$/);
      // A aba Estante continua montada e escondida (Activity), com o mesmo aviso
      await expect(
        page
          .getByRole("main")
          .getByText("Este perfil é privado")
          .filter({ visible: true }),
      ).toHaveCount(1);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("editar perfil só aparece no meu, e salva", async ({
    page,
    baseURL,
  }) => {
    const user = await createTestUser({
      onboarded: true,
      displayName: "Lia Teste",
    });
    try {
      await signInAs(page, user, baseURL);
      await page.goto(`/@${user.username}`);
      const edit = page.getByRole("button", { name: "Editar perfil" });
      await waitForHydration(edit);
      await edit.click();

      const sheet = page.getByRole("dialog", { name: "Editar perfil" });
      await expect(sheet).toBeVisible();
      await sheet.getByLabel("Bio").fill("Leio de tudo um pouco, devagar.");
      await sheet.getByRole("button", { name: "Poesia" }).click();
      await sheet.getByRole("button", { name: "Salvar" }).click();

      await expect(sheet).toBeHidden();
      await expect(
        page.getByRole("main").getByText("Leio de tudo um pouco, devagar."),
      ).toBeVisible();
      await expect(page.getByRole("main").getByText("Poesia")).toBeVisible();

      await page.goto("/@ana");
      await expect(
        page.getByRole("heading", { level: 1, name: "Ana Souza" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Editar perfil" }),
      ).toHaveCount(0);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("@ que não existe mostra a página de não encontrado", async ({
    page,
  }) => {
    await page.goto("/@ninguem_aqui_123");
    await expect(
      page.getByRole("heading", { name: "Essa página não está na estante." }),
    ).toBeVisible();
  });
});
