import { expect, test, type Locator } from "@playwright/test";
import { openCommandPalette } from "./helpers";

// WCAG 1.4.11: o fundo do item ativo fica perto de 1,1:1 contra o menu, então
// quem navega pelo teclado precisa de outro sinal com 3:1, a barra de acento
async function marker(item: Locator) {
  return item.evaluate((el) => {
    const style = getComputedStyle(el, "::before");
    return { opacity: style.opacity, color: style.backgroundColor };
  });
}

test.describe("item ativo de menu e paleta bem visível", () => {
  test("na paleta, a opção selecionada ganha a barra de acento", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/dev");
    const palette = await openCommandPalette(page);
    await page.keyboard.press("ArrowDown");
    const selected = palette.locator('[cmdk-item][data-selected="true"]');
    const other = palette
      .locator('[cmdk-item]:not([data-selected="true"])')
      .first();
    expect(await marker(selected)).toEqual({
      opacity: "1",
      color: "rgb(217, 84, 30)",
    });
    expect((await marker(other)).opacity).toBe("0");
  });

  test("no menu, o item ativo ganha a barra de acento", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/dev");
    const trigger = page.getByRole("button", { name: "Abrir menu da conta" });
    const menu = page.getByRole("menu");
    const first = menu.getByRole("menuitem", { name: "Meu perfil" });
    // Um Enter apertado antes de a demo hidratar é repetido pelo React, mas o
    // Radix não fica sabendo que veio do teclado e foca o menu, não o primeiro
    // item. Fecha e tenta de novo até abrir como um teclado abriria.
    await expect(async () => {
      if (await menu.isVisible()) {
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();
      }
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(first).toBeFocused({ timeout: 2000 });
    }).toPass();
    await page.keyboard.press("ArrowDown");
    const active = menu.getByRole("menuitem", { name: "Configurações" });
    await expect(active).toBeFocused();
    await expect(active).toHaveAttribute("data-highlighted");
    expect(await marker(active)).toEqual({
      opacity: "1",
      color: "rgb(217, 84, 30)",
    });
    const idle = menu.getByRole("menuitem", { name: "Meu perfil" });
    expect((await marker(idle)).opacity).toBe("0");
  });
});
