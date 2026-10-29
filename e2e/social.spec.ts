import { expect, test } from "@playwright/test";
import { seedId } from "../scripts/seed-ids";
import { trackPageErrors, waitForHydration } from "./helpers";
import {
  adminClient,
  createTestUser,
  deleteTestUser,
  sessionCookies,
} from "./support/supabase-admin";

// SPEC §9: seguir alguém e copiar livro e coleção de outro perfil
test("seguir a Ana e copiar um livro e uma coleção dela", async ({
  page,
  baseURL,
}) => {
  test.slow();
  const user = await createTestUser({
    onboarded: true,
    displayName: "Teo Teste",
  });
  const admin = adminClient();
  const ana = seedId("user", "ana");
  const collection = seedId("collection", "classicos-brasileiros");
  try {
    await page
      .context()
      .addCookies(await sessionCookies(user, { url: baseURL ?? "" }));
    const errors = trackPageErrors(page);
    const main = page.getByRole("main");

    await page.goto("/@ana");
    const follow = main.getByRole("button", { name: "Seguir" });
    await waitForHydration(follow);
    await follow.click();
    // A aba escondida pela Activity guarda uma cópia do cabeçalho
    await expect(
      main.getByRole("button", { name: "Seguindo" }).first(),
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await admin
              .from("follows")
              .select("following_id, status")
              .eq("follower_id", user.id)
          ).data,
      )
      .toEqual([{ following_id: ana, status: "accepted" }]);

    // Um livro da estante dela vem para a minha, com o crédito. Na Lista o
    // Copiar está sempre lá (na Estante, só com a lombada em destaque)
    await main
      .getByRole("radiogroup", { name: "Visualização" })
      .getByRole("radio", { name: "Lista" })
      .click();
    await main
      .getByRole("button", { name: "Copiar Dom Casmurro para a sua estante" })
      .click();
    const form = page.getByRole("dialog");
    await form.getByRole("radio", { name: "Quero ler" }).click();
    await form.getByRole("button", { name: "Copiar" }).click();
    await expect(
      page.getByRole("listitem").filter({ hasText: "Na sua estante" }),
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await admin
              .from("user_books")
              .select("book_id, status, copied_from_user_id")
              .eq("user_id", user.id)
          ).data,
      )
      .toEqual([
        {
          book_id: seedId("book", "dom-casmurro"),
          status: "want",
          copied_from_user_id: ana,
        },
      ]);

    // E uma coleção dela, que nasce "inspirada em @ana"
    await page.goto(`/colecao/${collection}`);
    const copy = main.getByRole("button", { name: "Copiar coleção" });
    await waitForHydration(copy);
    await copy.click();
    await expect(
      page.getByRole("listitem").filter({ hasText: "Coleção copiada" }),
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          (
            await admin
              .from("collections")
              .select("copied_from_id")
              .eq("owner_id", user.id)
          ).data,
      )
      .toEqual([{ copied_from_id: collection }]);

    expect(errors).toEqual([]);
  } finally {
    await deleteTestUser(user.id);
  }
});
