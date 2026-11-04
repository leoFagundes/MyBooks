import { expect, test } from "@playwright/test";
import { waitForHydration } from "./helpers";
import {
  createTestUser,
  deleteTestUser,
  sessionCookies,
} from "./support/supabase-admin";

// A varredura de segurança (ajustes finais): os cabeçalhos e a senha atual
// para trocar a senha e excluir a conta

test("as páginas mandam os cabeçalhos de segurança", async ({ request }) => {
  const response = await request.get("/entrar");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("trocar a senha e excluir a conta pedem a senha atual", async ({
  page,
  baseURL,
}) => {
  test.slow();
  const user = await createTestUser({
    onboarded: true,
    displayName: "Rui Senha",
  });
  try {
    await page
      .context()
      .addCookies(await sessionCookies(user, { url: baseURL ?? "" }));
    await page.goto("/configuracoes");
    const section = page.getByRole("region", { name: "Conta" });
    const current = section.getByLabel("Senha atual");
    await waitForHydration(current);
    const next = "Outra-senha-forte-123";
    await section.getByLabel("Senha nova").fill(next);
    await section.getByLabel("Repita a senha").fill(next);

    await section.getByRole("button", { name: "Trocar senha" }).click();
    await expect(section.getByText("Digite sua senha atual.")).toBeVisible();

    await current.fill("senha-errada-123");
    await section.getByRole("button", { name: "Trocar senha" }).click();
    await expect(section.getByText("A senha atual não confere.")).toBeVisible();

    await current.fill(user.password);
    await section.getByRole("button", { name: "Trocar senha" }).click();
    await expect(page.getByText("Senha trocada")).toBeVisible();

    // Excluir: o botão só libera com o @ e a senha (agora a nova)
    await page.getByRole("button", { name: "Excluir minha conta" }).click();
    const dialog = page.getByRole("dialog", { name: "Excluir sua conta?" });
    await dialog
      .getByLabel(`Para confirmar, digite @${user.username}`)
      .fill(`@${user.username}`);
    const confirm = dialog.getByRole("button", { name: "Excluir para sempre" });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel("Sua senha").fill(user.password);
    await confirm.click();
    await expect(dialog.getByText("A senha atual não confere.")).toBeVisible();
  } finally {
    await deleteTestUser(user.id);
  }
});
