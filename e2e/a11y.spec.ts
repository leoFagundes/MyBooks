import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { seedId } from "../scripts/seed-ids";
import {
  createTestUser,
  deleteTestUser,
  sessionCookies,
  type TestUser,
} from "./support/supabase-admin";

// Acessibilidade (spec §8): nenhuma violação séria ou crítica das regras da
// WCAG 2.1 AA nas páginas principais, nos dois temas
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function audit(page: Page, path: string) {
  await page.goto(path);
  await page.getByRole("main").waitFor();
  // As entradas animadas terminam antes da leitura das cores
  await page.waitForTimeout(1500);
  const { violations } = await new AxeBuilder({ page })
    .withTags(TAGS)
    .analyze();
  return violations
    .filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    )
    .map(
      (violation) =>
        `${path} · ${violation.id}: ${violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(" "))
          .join(" | ")}`,
    );
}

const PUBLIC_PAGES = [
  "/",
  "/entrar",
  "/cadastro",
  "/explorar",
  `/livro/${seedId("book", "dom-casmurro")}`,
  "/@ana",
  `/colecao/${seedId("collection", "classicos-brasileiros")}`,
];

for (const theme of ["light", "dark"] as const) {
  test.describe(`tema ${theme === "light" ? "claro" : "escuro"}`, () => {
    test.use({ colorScheme: theme });

    test("páginas abertas", async ({ page }) => {
      test.slow();
      await page.addInitScript(
        (value) => localStorage.setItem("mybooks:tema", value),
        theme,
      );
      const problems: string[] = [];
      for (const path of PUBLIC_PAGES)
        problems.push(...(await audit(page, path)));
      expect(problems).toEqual([]);
    });

    test("páginas de quem tem conta", async ({ page, baseURL }) => {
      test.slow();
      let user: TestUser | null = null;
      try {
        user = await createTestUser({
          onboarded: true,
          displayName: "Ari Teste",
        });
        await page
          .context()
          .addCookies(await sessionCookies(user, { url: baseURL ?? "" }));
        await page.addInitScript(
          (value) => localStorage.setItem("mybooks:tema", value),
          theme,
        );
        const problems: string[] = [];
        for (const path of [
          "/inicio",
          "/configuracoes",
          `/@${user.username}`,
        ]) {
          problems.push(...(await audit(page, path)));
        }
        expect(problems).toEqual([]);
      } finally {
        if (user) await deleteTestUser(user.id);
      }
    });
  });
}
