import { expect, test } from "@playwright/test";
import { seedId } from "../scripts/seed-ids";
import { trackPageErrors, waitForHydration } from "./helpers";

// WebGL no Chromium headless: o SwiftShader faz as vezes da placa de vídeo
test.use({
  launchOptions: {
    args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
  },
});

// SPEC §9: abrir o visualizador 3D
test("Ver em 3D abre o livro em 3D; Esc fecha e o foco volta ao botão", async ({
  page,
}) => {
  test.slow();
  const errors = trackPageErrors(page);
  await page.goto(`/livro/${seedId("book", "dom-casmurro")}`);
  const open = page
    .getByRole("main")
    .getByRole("button", { name: "Ver em 3D" });
  await waitForHydration(open);
  await open.click();

  const viewer = page.getByRole("application", { name: "Dom Casmurro em 3D" });
  await expect(viewer).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "Abrir" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(viewer).toBeHidden();
  await expect(open).toBeFocused();
  expect(errors).toEqual([]);
});
