import { expect, type Page, test } from "@playwright/test";
import { seedId } from "../scripts/seed-ids";
import { trackPageErrors, waitForHydration } from "./helpers";
import {
  adminClient,
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

async function shelve(user: TestUser, books: Record<string, string>) {
  const { error } = await adminClient()
    .from("user_books")
    .insert(
      Object.entries(books).map(([slug, status]) => ({
        user_id: user.id,
        book_id: seedId("book", slug),
        status,
      })),
    );
  if (error) throw error;
}

test.describe("barra com a conta", () => {
  test("logada vê o menu da conta, e não o Entrar", async ({
    page,
    baseURL,
  }) => {
    const user = await createTestUser({
      onboarded: true,
      displayName: "Lia Teste",
    });
    try {
      await signInAs(page, user, baseURL);
      await page.goto("/dev");
      // A barra do site (a vitrine do /dev tem um menu da conta de exemplo)
      const bar = page.getByRole("banner");
      await expect(
        bar.getByRole("button", { name: "Abrir menu da conta" }),
      ).toBeVisible();
      await expect(
        bar.getByRole("link", { name: "Entrar", exact: true }),
      ).toHaveCount(0);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("Sair volta para a landing e deixa a conta para trás", async ({
    page,
    baseURL,
  }) => {
    const user = await createTestUser({
      onboarded: true,
      displayName: "Lia Teste",
    });
    try {
      await signInAs(page, user, baseURL);
      await page.goto("/inicio");
      const menu = page.getByRole("button", { name: "Abrir menu da conta" });
      await waitForHydration(menu);
      await menu.click();
      await page.getByRole("menuitem", { name: "Sair" }).click();
      await expect(page).toHaveURL(/\/$/);
      await expect(
        page.getByRole("link", { name: "Criar minha estante" }).first(),
      ).toBeVisible();

      await page.goto("/inicio");
      await expect(page).toHaveURL(/\/entrar\?next=%2Finicio$/);
    } finally {
      await deleteTestUser(user.id);
    }
  });
});

test.describe("início", () => {
  test("cumprimenta pelo nome, conta a estante e mostra o que está lendo", async ({
    page,
    baseURL,
  }) => {
    const user = await createTestUser({
      onboarded: true,
      displayName: "Lia Teste",
    });
    try {
      await shelve(user, { "dom-casmurro": "reading", "o-hobbit": "read" });
      await signInAs(page, user, baseURL);
      const errors = trackPageErrors(page);
      await page.goto("/inicio");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Lia/);
      const main = page.getByRole("main");
      await expect(main.getByText("2 livros na estante")).toBeVisible();
      // Só o que está sendo lido entra no "Lendo agora"
      const reading = main.getByRole("region", { name: "Lendo agora" });
      await expect(
        reading.getByRole("button", { name: /^Dom Casmurro:/ }),
      ).toBeVisible();
      await expect(
        reading.getByRole("button", { name: /^O Hobbit:/ }),
      ).toHaveCount(0);
      // Sem erro de hidratação nem exceção na página
      expect(errors).toEqual([]);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("sem livros nem quem seguir, o vazio convida a seguir leitores", async ({
    page,
    baseURL,
  }) => {
    const user = await createTestUser({
      onboarded: true,
      displayName: "Lia Teste",
    });
    try {
      await signInAs(page, user, baseURL);
      await page.goto("/inicio");
      // No main: por uns 200ms o streaming do React ainda guarda uma cópia
      // escondida (div#S:n[hidden]) do conteúdo que já apareceu
      const main = page.getByRole("main");
      await expect(
        main.getByText("Siga leitores para ver o que eles leem"),
      ).toBeVisible();
      await expect(main.getByRole("link", { name: "Explorar" })).toBeVisible();
      await expect(main.getByText(/livros? na estante/)).toHaveCount(0);
    } finally {
      await deleteTestUser(user.id);
    }
  });

  test("quem não terminou o onboarding é levado a ele", async ({
    page,
    baseURL,
  }) => {
    const user = await createTestUser();
    try {
      await signInAs(page, user, baseURL);
      await page.goto("/inicio");
      await expect(page).toHaveURL(/\/onboarding$/);
    } finally {
      await deleteTestUser(user.id);
    }
  });
});

test("na landing, Criar minha estante leva ao cadastro", async ({ page }) => {
  await page.goto("/");
  // A landing convida no topo e na chamada final: vale o do topo
  const cta = page.getByRole("link", { name: "Criar minha estante" }).first();
  await waitForHydration(cta);
  await cta.click();
  await expect(page).toHaveURL(/\/cadastro$/);
});
