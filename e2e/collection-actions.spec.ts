import { expect, test, type Page } from "@playwright/test";
import { waitForHydration } from "./helpers";

const DEMO = "/dev/colecao/classicos-brasileiros";

// Só a seção de coleções: a de botões também tem um "Nova coleção" de amostra
const collectionsSection = (page: Page) =>
  page.getByRole("region", { name: "Coleções" });

const actions = (page: Page) =>
  page.getByRole("group", { name: "Ações da coleção" });

async function openDemo(page: Page) {
  await page.goto(DEMO);
  await waitForHydration(actions(page));
}

async function openSection(page: Page) {
  await page.goto("/dev#colecoes");
  await waitForHydration(
    collectionsSection(page).getByRole("button", { name: "Nova coleção" }),
  );
}

test.describe("ações da coleção", () => {
  test("curtir alterna o estado e o contador", async ({ page }) => {
    await openDemo(page);
    const like = actions(page).getByRole("button", { name: "Curtir" });
    // O texto do botão é "Curtir" (só para leitor de tela) e o número
    await expect(like).toHaveAttribute("aria-pressed", "false");
    await expect(like).toHaveText(/\b34$/, { useInnerText: true });
    await like.click();
    await expect(like).toHaveAttribute("aria-pressed", "true");
    await expect(like).toHaveText(/\b35$/, { useInnerText: true });
    await like.click();
    await expect(like).toHaveAttribute("aria-pressed", "false");
    await expect(like).toHaveText(/\b34$/, { useInnerText: true });
  });

  test("uma ação que falha volta atrás com um aviso gentil", async ({
    page,
  }) => {
    await openDemo(page);
    await page.getByRole("switch", { name: "Simular erro nas ações" }).click();
    const like = actions(page).getByRole("button", { name: "Curtir" });
    await like.click();
    await expect(page.getByText("Não deu para curtir agora")).toBeVisible();
    await expect(like).toHaveAttribute("aria-pressed", "false");
    await expect(like).toHaveText(/\b34$/, { useInnerText: true });
  });

  test("salvar vira salva", async ({ page }) => {
    await openDemo(page);
    await actions(page).getByRole("button", { name: "Salvar" }).click();
    await expect(
      actions(page).getByRole("button", { name: "Salva", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("sem o compartilhar do sistema, copia o link", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { value: undefined });
    });
    await openDemo(page);
    await actions(page).getByRole("button", { name: "Compartilhar" }).click();
    await expect(page.getByText("Link copiado")).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      new URL(DEMO, page.url()).href,
    );
  });

  test("no celular, abre o compartilhar do sistema", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "o compartilhar do sistema é para toque");
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", {
        value: async (data: ShareData) => {
          (window as unknown as { shared: ShareData }).shared = data;
        },
      });
    });
    await openDemo(page);
    await actions(page).getByRole("button", { name: "Compartilhar" }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { shared?: ShareData }).shared?.url,
        ),
      )
      .toBe(new URL(DEMO, page.url()).href);
  });

  test("copiar trava o botão e mostra o caminho para a cópia", async ({
    page,
  }) => {
    await openDemo(page);
    const copy = actions(page).getByRole("button", { name: "Copiar coleção" });
    await copy.click();
    await expect(copy).toBeDisabled();
    await expect(page.getByText("Coleção copiada")).toBeVisible();
    await expect(page.getByRole("button", { name: "Abrir" })).toBeVisible();
  });
});

test.describe("formulário da coleção", () => {
  test("valida, revela o convite e cria", async ({ page }) => {
    await openSection(page);
    await collectionsSection(page)
      .getByRole("button", { name: "Nova coleção" })
      .click();
    const form = page.getByRole("dialog", { name: "Nova coleção" });
    const submit = form.getByRole("button", { name: "Criar coleção" });

    await submit.click();
    await expect(form.getByText("Dê um título à coleção")).toBeVisible();

    await form
      .getByRole("textbox", { name: "Título" })
      .fill("Para reler nas férias");
    await form.getByRole("radio", { name: "Outro" }).click();
    const other = form.getByRole("textbox", { name: "Escreva um emoji" });
    await other.fill("😀😀");
    await submit.click();
    await expect(form.getByText("Um emoji só")).toBeVisible();
    await other.fill("🏖️");

    const invite = form.getByRole("textbox", { name: "Convidar por @" });
    await expect(invite).toHaveCount(0);
    await form.getByRole("switch", { name: "Colaborativa" }).click();
    await expect(invite).toBeVisible();
    await invite.fill("@Bia");
    await form.getByRole("button", { name: "Convidar" }).click();
    await expect(
      form.getByRole("listitem").filter({ hasText: "@bia" }),
    ).toBeVisible();

    await submit.click();
    await expect(form).toBeHidden();
    await expect(page.getByText("Coleção criada")).toBeVisible();
  });

  test("dá para preencher tudo pelo teclado", async ({ page }) => {
    await openSection(page);
    const open = collectionsSection(page).getByRole("button", {
      name: "Nova coleção",
    });
    await open.focus();
    await page.keyboard.press("Enter");
    const form = page.getByRole("dialog", { name: "Nova coleção" });
    await expect(form.getByRole("textbox", { name: "Título" })).toBeFocused();
    const submit = form.getByRole("button", { name: "Criar coleção" });
    let reached = false;
    for (let i = 0; i < 20 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await submit.evaluate((el) => el === document.activeElement);
    }
    expect(reached).toBe(true);
  });
});
