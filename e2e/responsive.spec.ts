import { expect, test } from "@playwright/test";

// Spec §8: responsivo de 360px a 1920px. Nada pode empurrar a página para os
// lados: no celular isso alarga a viewport e desloca até as gavetas fixas.
test.describe("sem rolagem horizontal", () => {
  for (const width of [360, 1920]) {
    for (const path of ["/", "/dev"] as const) {
      test(`${path} em ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
      });
    }
  }
});
