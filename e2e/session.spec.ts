import { expect, test } from "@playwright/test";

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
