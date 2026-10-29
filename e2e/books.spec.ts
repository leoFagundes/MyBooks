import { expect, test } from "@playwright/test";

test.describe("capas, lombadas e prateleira", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev");
  });

  test("livro sem capa mostra a capa tipográfica com o título", async ({
    page,
  }) => {
    const cover = page.getByTestId("capa-a-paixao-segundo-gh");
    await cover.scrollIntoViewIfNeeded();
    await expect(cover).toHaveAttribute("data-cover", "generated");
    await expect(cover).toContainText("A Paixão Segundo G.H.");
  });

  test("capa que não carrega cai na tipográfica", async ({ page }) => {
    const cover = page.getByTestId("capa-quarto-de-despejo");
    await cover.scrollIntoViewIfNeeded();
    await expect(cover).toHaveAttribute("data-cover", "generated");
    await expect(cover).toContainText("Quarto de Despejo");
  });

  test("capa real aparece como imagem", async ({ page }) => {
    // A capa aparece em mais de uma demonstração do /dev: vale a primeira
    const cover = page.getByTestId("capa-torto-arado").first();
    await cover.scrollIntoViewIfNeeded();
    await expect(cover).toHaveAttribute("data-cover", "image");
    await expect(
      cover.getByRole("img", { name: "Capa de Torto Arado" }),
    ).toBeVisible();
  });

  test.describe("sem JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    // A capa costuma ser o LCP: não pode esperar a hidratação para aparecer
    test("a capa aparece sem esperar a hidratação", async ({ page }) => {
      const image = page
        .getByTestId("capa-torto-arado")
        .first()
        .getByRole("img", { name: "Capa de Torto Arado" });
      await expect(image).toHaveCSS("opacity", "1");
    });
  });

  test("a prateleira mostra uma lombada por livro", async ({ page }) => {
    const shelf = page.getByRole("list", { name: "Prateleira" });
    await expect(shelf.getByRole("listitem")).toHaveCount(15);
  });

  test("lombada com foco levanta, como no hover", async ({ page }) => {
    const spine = page
      .getByRole("list", { name: "Prateleira" })
      .getByRole("link", { name: /Torto Arado/ });
    await spine.focus();
    await expect(spine).toHaveAttribute("data-lifted", "true");
  });
});

// Spec §8 (contraste AA): mede o contraste efetivo de cada texto sobre a cor
// do livro, contando a opacidade, contra o primeiro fundo opaco acima dele
test.describe("contraste do texto sobre as capas", () => {
  for (const [name, selector] of [
    ["lombadas", '[aria-label="Prateleira"] a'],
    ["capas tipográficas", '[data-cover="generated"] [role="img"]'],
  ] as const) {
    test(`o texto das ${name} tem contraste AA`, async ({ page }) => {
      await page.goto("/dev");
      await expect(page.locator(selector).first()).toBeVisible();
      const low = await page.locator(selector).evaluateAll((nodes) => {
        const rgba = (color: string) => color.match(/[\d.]+/g)!.map(Number);
        const linear = (c: number) => {
          const v = c / 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        const luminance = ([r, g, b]: number[]) =>
          0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
        const background = (node: Element | null): number[] => {
          for (let el = node; el; el = el.parentElement) {
            const color = rgba(getComputedStyle(el).backgroundColor);
            if ((color[3] ?? 1) > 0) return color;
          }
          return [255, 255, 255];
        };
        return nodes.flatMap((node) =>
          [...node.querySelectorAll("span, p")].flatMap((text) => {
            const style = getComputedStyle(text);
            const fg = rgba(style.color);
            const bg = background(node);
            const alpha = Number(style.opacity) * (fg[3] ?? 1);
            const seen = fg
              .slice(0, 3)
              .map((c, i) => c * alpha + bg[i] * (1 - alpha));
            const [light, dark] = [luminance(seen), luminance(bg)].sort(
              (a, b) => b - a,
            );
            const ratio = (light + 0.05) / (dark + 0.05);
            return ratio < 4.5
              ? [`${text.textContent}: ${ratio.toFixed(2)}`]
              : [];
          }),
        );
      });
      expect(low).toEqual([]);
    });
  }
});
