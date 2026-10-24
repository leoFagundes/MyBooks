import { expect, test, type Locator, type Page } from "@playwright/test";

// Spec §8 e WCAG 2.4.7: todo elemento focado pelo teclado mostra o contorno.
test.describe("foco visível pelo teclado", () => {
  test.skip(({ isMobile }) => isMobile, "foco por teclado: projeto desktop");

  // Volta e avança com Tab, para o navegador tratar o foco como de teclado
  async function focusByKeyboard(page: Page, target: Locator) {
    await target.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(target).toBeFocused();
  }

  const targets: [string, (page: Page) => Locator][] = [
    [
      "logo",
      (page) => page.getByRole("link", { name: "MyBooks, página inicial" }),
    ],
    [
      "link da barra",
      (page) =>
        page
          .getByRole("navigation", { name: "Navegação principal" })
          .getByRole("link", { name: "Explorar" }),
    ],
    [
      "aba",
      (page) =>
        page
          .getByRole("tablist", { name: "Seções do perfil" })
          .getByRole("tab", { name: "Estante" }),
    ],
    [
      "painel da aba",
      (page) => page.getByRole("tabpanel", { name: "Estante" }),
    ],
    [
      "opção do controle segmentado",
      (page) =>
        page
          .getByRole("radiogroup", { name: "Status de leitura" })
          .getByRole("radio", { name: "Todos" }),
    ],
    [
      "lombada",
      (page) =>
        page
          .getByRole("list", { name: "Prateleira" })
          .getByRole("link", { name: /Torto Arado/ }),
    ],
    ["campo", (page) => page.getByRole("textbox", { name: "Título" })],
    [
      "menu da conta",
      (page) => page.getByRole("button", { name: "Abrir menu da conta" }),
    ],
  ];

  for (const [name, locate] of targets) {
    test(`${name} mostra o contorno de foco`, async ({ page }) => {
      await page.goto("/dev");
      const target = locate(page);
      await focusByKeyboard(page, target);
      await expect(target).toHaveCSS("outline-style", "solid");
      await expect(target).toHaveCSS("outline-width", "2px");
    });
  }
});
