import { expect, test } from "@playwright/test";
import { nextTransition, spyViewTransitions } from "./support/view-transitions";

test.describe("transições entre páginas (build de produção)", () => {
  // Dentro do mesmo grupo, a página que sai fica guardada pelo Activity (só
  // escondida), então só a que chega anima
  test("entre páginas do app, a nova entra e a barra superior fica parada", async ({
    page,
  }) => {
    await spyViewTransitions(page);
    await page.goto("/dev/livro/dom-casmurro");
    await page.getByRole("link", { name: "Voltar para a vitrine" }).click();
    await expect(page).toHaveURL(/\/dev#visualizacoes$/);

    const transition = await nextTransition(page, 0);
    const names = transition.animations.map((animation) => animation.name);
    expect(names).toContain("pagina-entra");
    expect(
      transition.animations.filter((animation) =>
        animation.pseudo.includes("site-header"),
      ),
    ).toEqual([]);
  });

  test("entre entrar e cadastrar, a página nova entra", async ({ page }) => {
    await spyViewTransitions(page);
    await page.goto("/entrar");
    await page.getByRole("link", { name: "Criar conta" }).click();
    await expect(page).toHaveURL(/\/cadastro$/);

    const transition = await nextTransition(page, 0);
    expect(transition.animations.map((animation) => animation.name)).toContain(
      "pagina-entra",
    );
  });

  test("ao trocar de grupo de rotas (landing → entrar), a página também entra", async ({
    page,
  }) => {
    await spyViewTransitions(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Já tenho conta" }).click();
    await expect(page).toHaveURL(/\/entrar$/);

    const transition = await nextTransition(page, 0);
    const names = transition.animations.map((animation) => animation.name);
    expect(names).toContain("pagina-sai");
    expect(names).toContain("pagina-entra");
  });

  test("com movimento reduzido, a página só esmaece", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await spyViewTransitions(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Já tenho conta" }).click();
    await expect(page).toHaveURL(/\/entrar$/);

    const transition = await nextTransition(page, 0);
    const entering = transition.animations.find((animation) =>
      animation.pseudo.startsWith("::view-transition-new"),
    );
    expect(entering?.name).toBe("aparecer");
  });
});
