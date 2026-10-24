import { expect, test } from "@playwright/test";
import { trackPageErrors } from "./helpers";

test.describe("primitivos no /dev", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev");
  });

  test("o modal fecha com Esc e devolve o foco ao botão", async ({ page }) => {
    const errors = trackPageErrors(page);
    const trigger = page.getByRole("button", { name: "Remover da estante" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Remover da estante?" });
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
  });

  test("a gaveta abre e fecha pelo botão Fechar", async ({ page }) => {
    await page.getByRole("button", { name: "Abrir filtros" }).click();
    const sheet = page.getByRole("dialog", { name: "Filtros" });
    await expect(sheet).toBeVisible();

    await sheet.getByRole("button", { name: "Fechar" }).click();
    await expect(sheet).toBeHidden();
  });

  test("o popover abre e fecha com Esc", async ({ page }) => {
    await page.getByRole("button", { name: "Atualizar página" }).click();
    const field = page.getByRole("spinbutton", { name: "Página atual" });
    await expect(field).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(field).toBeHidden();
  });

  test("o controle segmentado anda com as setas", async ({ page }) => {
    const group = page.getByRole("radiogroup", { name: "Status de leitura" });
    const todos = group.getByRole("radio", { name: "Todos" });
    await expect(todos).toHaveAttribute("aria-checked", "true");

    await todos.focus();
    // O Radix marca o rádio quando o foco chega com a seta ainda pressionada;
    // o delay imita uma tecla de verdade (keyup instantâneo não marca).
    await page.keyboard.press("ArrowRight", { delay: 50 });
    await expect(group.getByRole("radio", { name: "Lido" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("as abas trocam o painel visível", async ({ page }) => {
    const tabs = page.getByRole("tablist", { name: "Seções do perfil" });
    await tabs.getByRole("tab", { name: "Coleções" }).click();
    await expect(
      page.getByRole("tabpanel", { name: "Coleções" }),
    ).toBeVisible();
    await expect(page.getByRole("tabpanel", { name: "Estante" })).toBeHidden();
  });
});
