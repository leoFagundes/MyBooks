import { expect, test, type Locator, type Page } from "@playwright/test";
import { waitForNetworkQuiet } from "./support/network";
import {
  nextTransition,
  type RecordedTransition,
  spyViewTransitions,
} from "./support/view-transitions";

const pseudos = (transition: RecordedTransition) =>
  transition.animations.map((animation) => animation.pseudo);

// Qual animação CSS roda em cada parte do par de um nome
const parts = (transition: RecordedTransition, name: string) =>
  Object.fromEntries(
    (["old", "new", "image-pair"] as const).map((part) => [
      part,
      transition.animations.find(
        (animation) =>
          animation.pseudo === `::view-transition-${part}(${name})`,
      )?.name,
    ]),
  );

const fontSize = (locator: Locator) =>
  locator.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));

// Sem carregar a página já com o hash: no Next 16.4.3, com partes dinâmicas
// no layout, o link de volta para o mesmo hash dobra o hash na URL
async function openView(page: Page, view: "Estante" | "Grade" | "Lista") {
  await page.goto("/dev");
  const views = page.getByRole("radiogroup", { name: "Visualização" });
  await views.scrollIntoViewIfNeeded();
  await views.getByRole("radio", { name: view }).click();
}

// Passa o mouse, espera o prefetch e clica, como uma pessoa que hesita um
// instante. A intenção pede o prefetch completo (Next-Router-Prefetch: 2),
// que pode sair só depois da fila dos prefetches automáticos; depois dele, a
// rede parada por 1s dá tempo de o roteador guardar a página, mesmo com a
// máquina ocupada (sem isso, o clique às vezes chega antes e mostra o
// skeleton, sem o par da capa)
async function travel(page: Page, link: Locator, slug: string) {
  await link.scrollIntoViewIfNeeded();
  const prefetch = page.waitForRequest(
    (request) =>
      request.url().includes(`/dev/livro/${slug}`) &&
      request.headers()["next-router-prefetch"] === "2",
  );
  await link.hover();
  await prefetch;
  await waitForNetworkQuiet(page, 1000);
  await link.click();
  await expect(page).toHaveURL(new RegExp(`/dev/livro/${slug}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: /Torto Arado|Dom Casmurro/ }),
  ).toBeVisible();
}

test.describe("a capa viaja até a página do livro (build de produção)", () => {
  test.beforeEach(async ({ page }) => {
    await spyViewTransitions(page);
  });

  test("da Grade, a capa clicada vira a capa do topo", async ({ page }) => {
    await openView(page, "Grade");
    const cover = page
      .getByRole("list", { name: "Grade de capas" })
      .getByRole("link", { name: "Torto Arado" });
    await travel(page, cover, "torto-arado");

    const transition = await nextTransition(page, 0);
    expect(pseudos(transition)).toEqual(
      expect.arrayContaining([
        "::view-transition-old(capa-torto-arado)",
        "::view-transition-new(capa-torto-arado)",
      ]),
    );
  });

  test("da Lista, a capa e o título viajam juntos", async ({ page }) => {
    await openView(page, "Lista");
    const title = page
      .getByRole("table", { name: "Lista de livros" })
      .getByRole("link", { name: "Torto Arado" });
    const fromSize = await fontSize(title);
    await travel(page, title, "torto-arado");
    const toSize = await fontSize(
      page.getByRole("heading", { level: 1, name: "Torto Arado" }),
    );

    const transition = await nextTransition(page, 0);
    expect(pseudos(transition)).toEqual(
      expect.arrayContaining([
        "::view-transition-old(capa-torto-arado)",
        "::view-transition-new(capa-torto-arado)",
        "::view-transition-old(titulo-torto-arado)",
        "::view-transition-new(titulo-torto-arado)",
      ]),
    );
    // As duas caixas abraçam o texto: o título cresce na escala da fonte e
    // as duas fotos se sobrepõem no meio do voo, sem um título fantasma
    const group = transition.animations.find(
      (animation) =>
        animation.pseudo === "::view-transition-group(titulo-torto-arado)",
    );
    const [from, to] = group?.widths ?? [1, 0];
    expect(to / from).toBeCloseTo(toSize / fromSize, 1);
  });

  // O voltar do navegador é instantâneo: o Next restaura a rota guardada de
  // forma síncrona no popstate, e o React só anima transições. O voltar da
  // própria página é uma navegação comum e refaz a viagem.
  test("da Estante, o livro gira pela quina até a capa e o voltar da página gira de volta", async ({
    page,
  }) => {
    await openView(page, "Estante");
    const spine = page
      .getByRole("list", { name: "Estante" })
      .getByRole("link", { name: /Dom Casmurro/ });
    await travel(page, spine, "dom-casmurro");

    const forward = await nextTransition(page, 0);
    expect(parts(forward, "capa-dom-casmurro")).toEqual({
      old: "lombada-sai",
      new: "capa-entra",
      "image-pair": "quina-ida",
    });

    await page.getByRole("link", { name: "Voltar para a vitrine" }).click();
    await expect(page).toHaveURL(/\/dev(#visualizacoes)?$/);
    const back = await nextTransition(page, 1);
    expect(parts(back, "capa-dom-casmurro")).toEqual({
      old: "capa-sai",
      new: "lombada-entra",
      "image-pair": "quina-volta",
    });
  });

  test("com movimento reduzido, nada se desloca: só esmaece", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openView(page, "Grade");
    const cover = page
      .getByRole("list", { name: "Grade de capas" })
      .getByRole("link", { name: "Torto Arado" });
    await travel(page, cover, "torto-arado");

    const transition = await nextTransition(page, 0);
    const moving = transition.animations.filter(
      (animation) =>
        animation.pseudo.startsWith("::view-transition-group") &&
        animation.duration > 0,
    );
    expect(moving).toEqual([]);
    const entering = transition.animations.find(
      (animation) =>
        animation.pseudo === "::view-transition-new(capa-torto-arado)",
    );
    expect(entering?.name).toBe("aparecer");
  });

  test("com movimento reduzido, a lombada não gira: a capa só aparece", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openView(page, "Estante");
    const spine = page
      .getByRole("list", { name: "Estante" })
      .getByRole("link", { name: /Dom Casmurro/ });
    await travel(page, spine, "dom-casmurro");

    const transition = await nextTransition(page, 0);
    expect(parts(transition, "capa-dom-casmurro")).toEqual({
      old: undefined,
      new: "aparecer",
      "image-pair": undefined,
    });
  });
});
