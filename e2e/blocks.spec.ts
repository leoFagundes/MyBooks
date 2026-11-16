import { type Browser, expect, test } from "@playwright/test";
import { seedId } from "../scripts/seed-ids";
import { trackPageErrors, waitForHydration } from "./helpers";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  sessionCookies,
  type TestUser,
} from "./support/supabase-admin";

// Bloquear pelo perfil e indicar um livro a quem segue você

async function pageAs(browser: Browser, user: TestUser, baseURL: string) {
  const context = await browser.newContext();
  await context.addCookies(await sessionCookies(user, { url: baseURL }));
  return context.newPage();
}

test("bloquear pelo perfil fecha a estante e desbloquear pelas configurações", async ({
  browser,
  baseURL,
}) => {
  test.slow();
  const ana = await createTestUser({ onboarded: true, displayName: "Teo Ana" });
  const bia = await createTestUser({ onboarded: true, displayName: "Teo Bia" });
  const admin = adminClient();
  try {
    await admin
      .from("follows")
      .insert({
        follower_id: bia.id,
        following_id: ana.id,
        status: "accepted",
      });

    const page = await pageAs(browser, ana, baseURL ?? "");
    const errors = trackPageErrors(page);
    const main = page.getByRole("main");
    await page.goto(`/@${bia.username}`);
    const more = main.getByRole("button", {
      name: `Mais ações para @${bia.username}`,
    });
    await waitForHydration(more);
    await more.click();
    await page.getByRole("menuitem", { name: "Bloquear" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Bloquear" })
      .click();
    await expect(main.getByText("Bloqueado").first()).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await admin
              .from("follows")
              .select("follower_id")
              .eq("following_id", ana.id)
          ).data?.length,
      )
      .toBe(0);

    // A Bia vê o perfil da Ana como indisponível
    const other = await pageAs(browser, bia, baseURL ?? "");
    await other.goto(`/@${ana.username}`);
    await expect(
      other.getByRole("main").getByText("Este perfil não está disponível"),
    ).toBeVisible();
    await expect(
      other.getByRole("main").getByRole("button", { name: /Seguir/ }),
    ).toHaveCount(0);

    // Desbloquear pela lista das configurações
    await page.goto("/configuracoes");
    const row = main
      .getByRole("listitem")
      .filter({ hasText: `@${bia.username}` });
    const undo = row.getByRole("button", { name: "Desbloquear" });
    await waitForHydration(undo);
    await undo.click();
    await expect(row).toHaveCount(0);
    await expect
      .poll(
        async () =>
          (
            await admin
              .from("user_blocks")
              .select("kind")
              .eq("blocker_id", ana.id)
          ).data?.length,
      )
      .toBe(0);
    expect(errors).toEqual([]);
  } finally {
    await deleteTestUser(ana.id);
    await deleteTestUser(bia.id);
  }
});

test("indicar um livro a quem segue e pôr na fila pelo sino", async ({
  browser,
  baseURL,
}) => {
  test.slow();
  const ana = await createTestUser({ onboarded: true, displayName: "Teo Ana" });
  const bia = await createTestUser({ onboarded: true, displayName: "Teo Bia" });
  const admin = adminClient();
  const book = seedId("book", "dom-casmurro");
  try {
    await admin
      .from("follows")
      .insert({
        follower_id: bia.id,
        following_id: ana.id,
        status: "accepted",
      });

    const page = await pageAs(browser, ana, baseURL ?? "");
    const errors = trackPageErrors(page);
    const main = page.getByRole("main");
    await page.goto(`/livro/${book}`);
    // A comunidade do livro em abas
    await expect(
      main.getByRole("tablist", { name: "A comunidade do livro" }),
    ).toBeVisible();
    await expect(main.getByRole("tab", { name: /Discussões/ })).toBeVisible();

    const recommend = main.getByRole("button", { name: "Indicar a alguém" });
    await waitForHydration(recommend);
    await recommend.click();
    const popover = page.getByRole("dialog");
    await popover.getByRole("button", { name: /Teo Bia/ }).click();
    await popover
      .getByLabel("Uma frase sobre o livro (opcional)")
      .fill("Você vai gostar do Bentinho.");
    await popover.getByRole("button", { name: "Indicar", exact: true }).click();
    await expect(
      page.getByText(`Indicado para @${bia.username}`),
    ).toBeVisible();

    // No sino da Bia, a indicação com a frase e o "Pôr na fila"
    const other = await pageAs(browser, bia, baseURL ?? "");
    await other.goto("/inicio");
    const bell = other.getByRole("button", { name: /Notificações/ });
    await waitForHydration(bell);
    await bell.click();
    const notice = other
      .getByRole("listitem")
      .filter({ hasText: "indicou Dom Casmurro" });
    await expect(notice).toContainText("Você vai gostar do Bentinho.");
    await notice.getByRole("button", { name: "Pôr na fila" }).click();
    await expect
      .poll(
        async () =>
          (
            await admin
              .from("user_books")
              .select("book_id, status, copied_from_user_id")
              .eq("user_id", bia.id)
          ).data,
      )
      .toEqual([
        { book_id: book, status: "want", copied_from_user_id: ana.id },
      ]);
    expect(errors).toEqual([]);
  } finally {
    await deleteTestUser(ana.id);
    await deleteTestUser(bia.id);
  }
});
