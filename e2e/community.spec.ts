import { expect, test, type Browser } from "@playwright/test";
import { trackPageErrors, waitForHydration } from "./helpers";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  sessionCookies,
  type TestUser,
} from "./support/supabase-admin";

// MELHORIAS 9.4: os fluxos da comunidade (fase 8) de ponta a ponta

/** Conta com dois dias: a de menos de um dia só publica uma vez por minuto. */
async function seasonedUser(displayName: string) {
  const user = await createTestUser({ onboarded: true, displayName });
  const { error } = await adminClient()
    .from("profiles")
    .update({ created_at: new Date(Date.now() - 2 * 86_400_000).toISOString() })
    .eq("id", user.id);
  if (error) throw error;
  return user;
}

async function pageAs(browser: Browser, user: TestUser, baseURL: string) {
  const context = await browser.newContext();
  await context.addCookies(await sessionCookies(user, { url: baseURL }));
  return context.newPage();
}

test("abrir um tópico com títulos, responder e curtir", async ({
  page,
  baseURL,
}) => {
  test.slow();
  const user = await seasonedUser("Iracema Fórum");
  try {
    await page
      .context()
      .addCookies(await sessionCookies(user, { url: baseURL ?? "" }));
    const errors = trackPageErrors(page);
    const main = page.getByRole("main");

    await page.goto("/comunidade");
    const open = main.getByRole("button", { name: "Novo tópico" }).first();
    await waitForHydration(open);
    await open.click();
    const editor = page.getByRole("dialog", { name: "Novo tópico" });
    await editor
      .getByLabel("Título", { exact: true })
      .fill("Releituras que mudaram a minha opinião");
    await editor.getByRole("button", { name: "Título 1" }).click();
    await editor
      .getByLabel("Texto", { exact: true })
      .fill(
        "# Dom Casmurro\n\nNa escola achei **óbvio**; relendo, a narração é que é suspeita.\n\n## E vocês?",
      );
    await editor.getByRole("button", { name: "Publicar" }).click();

    await expect(page).toHaveURL(/\/comunidade\/[0-9a-f-]{36}$/);
    await expect(
      main.getByRole("heading", {
        level: 1,
        name: "Releituras que mudaram a minha opinião",
      }),
    ).toBeVisible();
    // O # do texto vira h2 (o h1 é o título do tópico) e o ## vira h3
    await expect(
      main.getByRole("heading", { level: 2, name: "Dom Casmurro" }),
    ).toBeVisible();
    await expect(
      main.getByRole("heading", { level: 3, name: "E vocês?" }),
    ).toBeVisible();

    const reply = main.getByRole("button", { name: "Responder" }).first();
    await waitForHydration(reply);
    await reply.click();
    const sheet = page.getByRole("dialog", { name: "Responder" });
    await sheet
      .getByPlaceholder("Escreva a sua resposta")
      .fill("Comigo foi igual com Memórias Póstumas.");
    await sheet.getByRole("button", { name: "Responder" }).click();
    await expect(
      main.getByText("Comigo foi igual com Memórias Póstumas."),
    ).toBeVisible();

    await main.getByRole("button", { name: "Curtir: 0" }).first().click();
    await expect(
      main.getByRole("button", { name: "Curtido: 1" }).first(),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await deleteTestUser(user.id);
  }
});

test("enviar uma sugestão e votar", async ({ page, browser, baseURL }) => {
  test.slow();
  const author = await seasonedUser("Clara Sugestão");
  const voter = await seasonedUser("Davi Voto");
  try {
    await page
      .context()
      .addCookies(await sessionCookies(author, { url: baseURL ?? "" }));
    const errors = trackPageErrors(page);

    // Configurações leva à gaveta já aberta
    await page.goto("/sugestoes?nova=1");
    const sheet = page.getByRole("dialog", { name: "Enviar sugestão" });
    await expect(sheet).toBeVisible();
    await sheet
      .getByLabel("Título", { exact: true })
      .fill("Lembrete para voltar ao livro que estou lendo");
    await sheet
      .getByLabel("Descrição")
      .fill("Um aviso quando passo uma semana sem abrir o livro.");
    await sheet.getByRole("button", { name: "Enviar" }).click();
    await expect(page).toHaveURL(/\/sugestoes\/[0-9a-f-]{36}$/);
    const url = page.url();
    // Quem sugere já vota
    await expect(
      page
        .getByRole("main")
        .getByRole("button", { name: "Tirar o voto: 1 voto" }),
    ).toBeVisible();

    const other = await pageAs(browser, voter, baseURL ?? "");
    await other.goto(url);
    const vote = other
      .getByRole("main")
      .getByRole("button", { name: "Votar: 1 voto" });
    await waitForHydration(vote);
    await vote.click();
    await expect(
      other
        .getByRole("main")
        .getByRole("button", { name: "Tirar o voto: 2 votos" }),
    ).toBeVisible();
    await other.context().close();
    expect(errors).toEqual([]);
  } finally {
    await deleteTestUser(author.id);
    await deleteTestUser(voter.id);
  }
});

test("denunciar um tópico e a moderação o ocultar", async ({
  page,
  browser,
  baseURL,
}) => {
  test.slow();
  const author = await seasonedUser("Paulo Autor");
  const reporter = await seasonedUser("Rita Denúncia");
  const moderator = await seasonedUser("Marta Moderação");
  const admin = adminClient();
  try {
    await admin
      .from("user_roles")
      .insert({ user_id: moderator.id, role: "moderator" });
    const { data: category, error: categoryError } = await admin
      .from("forum_categories")
      .select("id")
      .eq("slug", "geral")
      .single();
    if (categoryError) throw categoryError;
    const title = `Compro seguidores baratos ${author.username}`;
    const { data: topic, error } = await admin
      .from("forum_topics")
      .insert({
        category_id: category.id,
        author_id: author.id,
        title,
        body: "Promoção imperdível.",
      })
      .select("id")
      .single();
    if (error) throw error;

    await page
      .context()
      .addCookies(await sessionCookies(reporter, { url: baseURL ?? "" }));
    await page.goto(`/comunidade/${topic.id}`);
    const more = page
      .getByRole("main")
      .getByRole("button", { name: "Mais ações do tópico" });
    await waitForHydration(more);
    await more.click();
    await page.getByRole("menuitem", { name: "Denunciar" }).click();
    const dialog = page.getByRole("dialog", { name: "Denunciar" });
    await dialog.getByRole("radio", { name: "Spam ou propaganda" }).check();
    await dialog.getByRole("button", { name: "Denunciar" }).click();
    await expect(dialog).toBeHidden();

    const staff = await pageAs(browser, moderator, baseURL ?? "");
    await staff.goto("/admin/moderacao");
    const tab = staff.getByRole("tab", { name: /^Denúncias/ });
    await waitForHydration(tab);
    await tab.click();
    const item = staff.getByRole("listitem").filter({ hasText: title });
    await item.getByRole("button", { name: "Ocultar o conteúdo" }).click();
    await expect
      .poll(
        async () =>
          (
            await admin
              .from("forum_topics")
              .select("hidden_at")
              .eq("id", topic.id)
              .single()
          ).data?.hidden_at,
      )
      .not.toBeNull();
    await staff.context().close();

    // Para quem denunciou, o tópico sumiu
    await page.goto(`/comunidade/${topic.id}`);
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeHidden();
  } finally {
    await deleteTestUser(author.id);
    await deleteTestUser(reporter.id);
    await deleteTestUser(moderator.id);
  }
});
