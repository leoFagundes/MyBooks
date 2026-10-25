import path from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { waitForHydration } from "./helpers";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  sessionCookies,
  type TestUser,
} from "./support/supabase-admin";

const AVATAR = path.resolve("e2e/fixtures/avatar.png");

// Quatro passos com escritas no banco e envio de foto: no dev, mais que 30s
test.describe.configure({ timeout: 90_000 });

async function openOnboarding(page: Page, user: TestUser, baseURL?: string) {
  await page
    .context()
    .addCookies(await sessionCookies(user, { url: baseURL ?? "" }));
  await page.goto("/onboarding");
  const name = page.getByLabel("Seu nome");
  await waitForHydration(name);
  return name;
}

// Um @ livre e estável por conta de teste (o id só tem [0-9a-f-])
const freeUsername = (user: TestUser) => `leitora_${user.id.slice(0, 8)}`;

async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 40; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press("Tab");
  }
  throw new Error("O Tab não chegou ao elemento");
}

test("os quatro passos levam ao /inicio, com foto, gêneros, livro e quem seguir", async ({
  page,
  baseURL,
}) => {
  const user = await createTestUser();
  try {
    const name = await openOnboarding(page, user, baseURL);

    // 1. Nome, @ e foto
    const username = page.getByLabel("Seu @");
    await username.fill("ana");
    await expect(page.getByText("Esse @ já tem dono")).toBeVisible();
    await username.fill(freeUsername(user));
    await expect(page.getByText("Disponível")).toBeVisible();
    await name.fill("Leitora de Teste");
    await page.locator('input[type="file"]').setInputFiles(AVATAR);
    const crop = page.getByRole("dialog", { name: "Ajuste sua foto" });
    await expect(crop).toBeVisible();
    await crop.getByRole("button", { name: "Usar esta foto" }).click();
    await expect(crop).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Trocar foto" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    // 2. Gêneros
    await expect(
      page.getByRole("heading", { name: "Do que você gosta de ler?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Literatura brasileira" }).click();
    await page.getByRole("button", { name: "Clássicos" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();

    // 3. Primeiros livros
    await page.getByLabel("Buscar no catálogo").fill("sertao");
    const book = page
      .getByRole("listitem")
      .filter({ hasText: "Grande Sertão: Veredas" });
    await book.getByRole("button", { name: "Quero ler" }).click();
    await expect(book.getByText("Na estante")).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    // 4. Leitores para seguir: o item fica preso antes do clique, porque o
    // botão muda de nome
    const reader = page
      .getByRole("list", { name: "Leitores sugeridos" })
      .getByRole("listitem")
      .first();
    await reader.getByRole("button", { name: /^Seguir @/ }).click();
    await expect(
      reader.getByRole("button", { name: /^(Seguindo|Solicitado) @/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Concluir" }).click();

    await expect(page).toHaveURL(/\/inicio$/);
    await expect(
      page.getByRole("link", {
        name: "Grande Sertão: Veredas, de João Guimarães Rosa",
      }),
    ).toBeVisible();

    const { data } = await adminClient()
      .from("profiles")
      .select(
        "username, display_name, avatar_url, favorite_genres, onboarded_at",
      )
      .eq("id", user.id)
      .single();
    expect(data).toMatchObject({
      username: freeUsername(user),
      display_name: "Leitora de Teste",
      favorite_genres: ["literatura-brasileira", "classicos"],
    });
    expect(data?.avatar_url).toMatch(
      new RegExp(`^avatars/${user.id}/\\d+\\.(webp|png)$`),
    );
    expect(data?.onboarded_at).not.toBeNull();

    // Quem terminou não volta para o onboarding
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/inicio$/);
  } finally {
    await deleteTestUser(user.id);
  }
});

test("dá para fazer o onboarding só com o teclado", async ({
  page,
  baseURL,
  isMobile,
}) => {
  test.skip(isMobile, "teclado: projeto desktop");
  const user = await createTestUser();
  try {
    const name = await openOnboarding(page, user, baseURL);
    await expect(name).toBeFocused();
    await page.keyboard.type("Pessoa do Teclado");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Seu @")).toBeFocused();
    await page.keyboard.press("Control+A");
    await page.keyboard.type(freeUsername(user));
    await expect(page.getByText("Disponível")).toBeVisible();
    await page.keyboard.press("Enter");

    const genres = page.getByRole("heading", {
      name: "Do que você gosta de ler?",
    });
    await expect(genres).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("button", { name: "Literatura brasileira" }),
    ).toHaveAttribute("aria-pressed", "true");
    await tabTo(page, page.getByRole("button", { name: "Continuar" }));
    await page.keyboard.press("Enter");

    await expect(
      page.getByRole("heading", { name: "Seus primeiros livros" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Buscar no catálogo")).toBeFocused();
    await page.keyboard.type("hobbit");
    const book = page.getByRole("listitem").filter({ hasText: "O Hobbit" });
    await tabTo(page, book.getByRole("button", { name: "Já li" }));
    await page.keyboard.press("Enter");
    await expect(book.getByText("Na estante")).toBeVisible();
    await tabTo(page, page.getByRole("button", { name: "Continuar" }));
    await page.keyboard.press("Enter");

    await expect(
      page.getByRole("heading", { name: "Leitores para seguir" }),
    ).toBeFocused();
    await tabTo(page, page.getByRole("button", { name: "Concluir" }));
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/inicio$/);
  } finally {
    await deleteTestUser(user.id);
  }
});
