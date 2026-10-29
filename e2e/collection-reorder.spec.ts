import { expect, test, type Locator, type Page } from "@playwright/test";
import { trackPageErrors, waitForHydration } from "./helpers";

const DEMO = "/dev/colecao/classicos-brasileiros";

const grid = (page: Page) =>
  page.getByRole("list", { name: "Livros da coleção" });

const order = (page: Page) =>
  grid(page)
    .locator(":scope > li")
    .evaluateAll((items) => items.map((item) => item.dataset.title));

const cover = (page: Page, title: string) =>
  grid(page).getByRole("img", { name: `Capa de ${title}` });

// O dnd-kit começa o arraste depois de 6px; passos curtos imitam a mão. A
// capa vai para o meio da tela antes: perto da borda, o dnd-kit rola a
// página sozinho e o destino sai do lugar
async function drag(page: Page, from: Locator, to: Locator) {
  await from.evaluate((element) => element.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  const start = await from.boundingBox();
  const end = await to.boundingBox();
  if (!start || !end) throw new Error("capa sem caixa na tela");
  const x = start.x + start.width / 2;
  const y = start.y + start.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 12, y, { steps: 4 });
  await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, {
    steps: 24,
  });
  await page.waitForTimeout(300);
  await page.mouse.up();
}

const announcement = (page: Page, text: string | RegExp) =>
  page.getByRole("status").filter({ hasText: text });

async function openDemo(page: Page) {
  await page.goto(DEMO);
  await waitForHydration(grid(page));
}

test.describe("grade reordenável da coleção", () => {
  // A vizinha da esquerda fica ao lado nas duas larguras (5 e 2 colunas)
  test("arrastar com o mouse troca o livro de lugar", async ({ page }) => {
    const errors = trackPageErrors(page);
    await openDemo(page);
    await expect(grid(page)).toBeVisible();
    expect((await order(page)).slice(0, 4)).toEqual([
      "Dom Casmurro",
      "Memórias Póstumas de Brás Cubas",
      "Grande Sertão: Veredas",
      "Vidas Secas",
    ]);
    await drag(
      page,
      cover(page, "Vidas Secas"),
      cover(page, "Grande Sertão: Veredas"),
    );
    await expect
      .poll(() => order(page))
      .toEqual([
        "Dom Casmurro",
        "Memórias Póstumas de Brás Cubas",
        "Vidas Secas",
        "Grande Sertão: Veredas",
        "A Hora da Estrela",
        "Quarto de Despejo",
        "Torto Arado",
        "A Paixão Segundo G.H.",
      ]);
    // Arrastar não abre a página do livro
    await expect(page).toHaveURL(new RegExp(`${DEMO}$`));
    expect(errors).toEqual([]);
  });

  test("pelo teclado, com anúncios em pt-BR", async ({ page }) => {
    await openDemo(page);
    const handle = grid(page).getByRole("button", {
      name: "Mover Vidas Secas",
    });
    await handle.focus();
    await page.keyboard.press("Space");
    await expect(announcement(page, "Você pegou Vidas Secas")).toHaveCount(1);
    // Setas para cima e para a esquerda chegam ao começo em qualquer largura.
    // Com folga: no limite da grade a seta não faz nada, e uma seta dada
    // enquanto a página ainda rola até o item pode se perder
    for (const key of [
      ...Array(6).fill("ArrowUp"),
      ...Array(6).fill("ArrowLeft"),
    ]) {
      await page.keyboard.press(key);
      await page.waitForTimeout(120);
    }
    await page.keyboard.press("Space");
    await expect.poll(async () => (await order(page))[0]).toBe("Vidas Secas");
    await expect(
      announcement(page, "Vidas Secas ficou na posição 1 de 8"),
    ).toHaveCount(1);
    await expect(handle).toBeFocused();
  });

  test("Esc no meio do arraste devolve a ordem", async ({ page }) => {
    await openDemo(page);
    const before = await order(page);
    await grid(page).getByRole("button", { name: "Mover Vidas Secas" }).focus();
    await page.keyboard.press("Space");
    // Como quem ouve o anúncio antes de seguir
    await expect(announcement(page, "Você pegou Vidas Secas")).toHaveCount(1);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Escape");
    await expect.poll(() => order(page)).toEqual(before);
    await expect(announcement(page, /cancelado/)).toHaveCount(1);
  });

  test("quem só visita não tem alças nem edita notas", async ({ page }) => {
    await openDemo(page);
    await page
      .getByRole("radiogroup", { name: "Ver como" })
      .getByRole("radio", { name: "Visitante" })
      .click();
    await expect(
      grid(page).getByRole("button", { name: /^Mover / }),
    ).toHaveCount(0);
    await expect(
      grid(page).getByRole("button", { name: "Por que está aqui?" }),
    ).toHaveCount(0);
    await expect(
      grid(page).getByText(/Capitu traiu ou não traiu/),
    ).toBeVisible();
  });

  test("a nota se escreve com Enter, se cancela com Esc e tem limite", async ({
    page,
  }) => {
    await openDemo(page);
    const item = grid(page).locator('li[data-title="Vidas Secas"]');
    await item.getByRole("button", { name: "Por que está aqui?" }).click();
    const field = item.getByRole("textbox", { name: "Nota sobre Vidas Secas" });
    await expect(field).toBeFocused();
    await field.fill("Curto, seco e inesquecível.");
    await page.keyboard.press("Enter");
    const edit = item.getByRole("button", {
      name: "Editar a nota de Vidas Secas",
    });
    await expect(field).toBeHidden();
    await expect(edit).toHaveText("Curto, seco e inesquecível.");
    await expect(edit).toBeFocused();

    await edit.click();
    await field.fill("Outra coisa");
    await page.keyboard.press("Escape");
    await expect(field).toBeHidden();
    await expect(edit).toHaveText("Curto, seco e inesquecível.");

    await edit.click();
    await field.fill("a".repeat(210));
    await expect(field).toHaveValue("a".repeat(200));
  });
});
