import { expect, test } from "@playwright/test";
import { nextTransition, spyViewTransitions } from "./support/view-transitions";

test.describe("transições entre páginas (build de produção)", () => {
  test("o conteúdo sai e entra, e a barra superior fica parada", async ({
    page,
  }) => {
    await spyViewTransitions(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Ver os componentes" }).click();
    await expect(page).toHaveURL(/\/dev$/);

    const transition = await nextTransition(page, 0);
    const names = transition.animations.map((animation) => animation.name);
    expect(names).toContain("pagina-sai");
    expect(names).toContain("pagina-entra");
    expect(
      transition.animations.filter((animation) =>
        animation.pseudo.includes("site-header"),
      ),
    ).toEqual([]);
  });

  test("com movimento reduzido, a página só esmaece", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await spyViewTransitions(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Ver os componentes" }).click();
    await expect(page).toHaveURL(/\/dev$/);

    const transition = await nextTransition(page, 0);
    const entering = transition.animations.find((animation) =>
      animation.pseudo.startsWith("::view-transition-new"),
    );
    expect(entering?.name).toBe("aparecer");
  });
});
