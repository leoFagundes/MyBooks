import { expect, test, type Page } from "@playwright/test";
import { trackPageErrors, waitForHydration } from "./helpers";
import {
  createTestUser,
  deleteTestUser,
  sessionCookies,
  type TestUser,
} from "./support/supabase-admin";

// MELHORIAS 9.4: o app instalável (9.1). O service worker só existe no build
// de produção; aqui ficam o manifest, a página offline e o "Instalar o app".

test("o manifest tem o nome, o modo standalone e ícones que existem", async ({
  request,
}) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: "MyBooks",
    display: "standalone",
    start_url: "/",
  });
  expect(
    manifest.icons.some(
      (icon: { purpose?: string }) => icon.purpose === "maskable",
    ),
  ).toBe(true);
  for (const image of [...manifest.icons, ...manifest.screenshots]) {
    const file = await request.get(image.src);
    expect(file.ok(), image.src).toBe(true);
    expect(file.headers()["content-type"]).toBe("image/png");
  }
});

test("a página sem conexão convida a tentar de novo", async ({ page }) => {
  await page.goto("/sem-conexao");
  await expect(
    page.getByRole("heading", { name: "A internet saiu para um café." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tentar de novo" }),
  ).toBeVisible();
});

test.describe("Instalar o app em Configurações", () => {
  let user: TestUser;

  test.beforeAll(async () => {
    user = await createTestUser({ onboarded: true, displayName: "Nina App" });
  });
  test.afterAll(async () => {
    await deleteTestUser(user.id);
  });

  async function openSettings(page: Page, baseURL: string) {
    await page
      .context()
      .addCookies(await sessionCookies(user, { url: baseURL }));
    await page.goto("/configuracoes");
    return page.getByRole("region", { name: "Instalar o app" });
  }

  test("no Chrome, o botão abre o diálogo do navegador", async ({
    page,
    baseURL,
  }) => {
    const errors = trackPageErrors(page);
    const section = await openSettings(page, baseURL ?? "");
    await waitForHydration(section.getByRole("paragraph").first());
    // O Chrome manda o evento quando dá para instalar
    await page.evaluate(() => {
      const event = new Event("beforeinstallprompt", { cancelable: true });
      Object.assign(event, {
        prompt: async () => {
          (window as unknown as { prompted: boolean }).prompted = true;
        },
        userChoice: Promise.resolve({ outcome: "accepted" }),
      });
      window.dispatchEvent(event);
    });
    await section.getByRole("button", { name: "Instalar o app" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { prompted?: boolean }).prompted,
        ),
      )
      .toBe(true);
    expect(errors).toEqual([]);
  });

  test.describe("no iPhone", () => {
    test.use({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      hasTouch: true,
    });

    test("o botão mostra o passo a passo do Safari", async ({
      page,
      baseURL,
    }) => {
      const section = await openSettings(page, baseURL ?? "");
      const button = section.getByRole("button", { name: "Instalar o app" });
      await waitForHydration(button);
      await button.click();
      const guide = page.getByRole("dialog", { name: "Instalar o MyBooks" });
      await expect(guide).toBeVisible();
      await expect(guide.getByRole("listitem")).toHaveCount(3);
      await expect(guide).toContainText("Adicionar à Tela de Início");
      await page.keyboard.press("Escape");
      await expect(guide).toBeHidden();
    });
  });

  test("com o app instalado, o botão some", async ({ page, baseURL }) => {
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query: string) =>
        query === "(display-mode: standalone)"
          ? ({
              ...original(query),
              matches: true,
              media: query,
              addEventListener: () => {},
              removeEventListener: () => {},
            } as MediaQueryList)
          : original(query);
    });
    const section = await openSettings(page, baseURL ?? "");
    await expect(
      section.getByText("O MyBooks já está instalado neste aparelho."),
    ).toBeVisible();
    await expect(
      section.getByRole("button", { name: "Instalar o app" }),
    ).toHaveCount(0);
  });
});
