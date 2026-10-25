import { expect, test } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  sessionCookies,
} from "./support/supabase-admin";

test.describe("sessão no proxy", () => {
  test("sem conta, o /inicio leva ao /entrar com a volta", async ({ page }) => {
    await page.goto("/inicio");
    await expect(page).toHaveURL(/\/entrar\?next=%2Finicio$/);
  });

  test("sem conta, o /onboarding também pede login", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/entrar\?next=%2Fonboarding$/);
  });

  test("sem conta, a landing e o /dev seguem abertos", async ({ page }) => {
    for (const path of ["/", "/dev"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      expect(new URL(page.url()).pathname).toBe(path);
    }
  });
});

test.describe("sessão renovada", () => {
  test("a renovação no proxy sai com cache privado, no redirecionamento e na página", async ({
    page,
    baseURL,
  }) => {
    const user = await createTestUser({ onboarded: true });
    try {
      await page
        .context()
        .addCookies(
          await sessionCookies(user, { url: baseURL ?? "", expired: true }),
        );

      // Logada na landing: o proxy renova a sessão e manda para o /inicio
      const redirect = await page.request.get("/", { maxRedirects: 0 });
      expect(redirect.status()).toBe(307);
      expect(redirect.headers()["location"]).toMatch(/\/inicio$/);
      expect(redirect.headers()["cache-control"]).toContain("private");
      expect(redirect.headers()["set-cookie"]).toMatch(
        /sb-[a-z0-9]+-auth-token/,
      );

      // Numa página que não redireciona, o Next pode trocar o cabeçalho por
      // um mais estrito (no-store no dev); o que importa é não ir para cache
      // compartilhado
      await page
        .context()
        .addCookies(
          await sessionCookies(user, { url: baseURL ?? "", expired: true }),
        );
      const pageResponse = await page.request.get("/dev", { maxRedirects: 0 });
      expect(pageResponse.status()).toBe(200);
      expect(pageResponse.headers()["set-cookie"]).toMatch(
        /sb-[a-z0-9]+-auth-token/,
      );
      expect(pageResponse.headers()["cache-control"]).toMatch(
        /private|no-store/,
      );
      expect(pageResponse.headers()["cache-control"]).not.toMatch(
        /public|s-maxage/,
      );
    } finally {
      await deleteTestUser(user.id);
    }
  });
});
