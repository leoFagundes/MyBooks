import type { Page } from "@playwright/test";

/**
 * Espera a rede ficar parada (nenhum pedido em andamento por `quietMs`).
 * Serve para esperar o prefetch que o BookLink pede na intenção, como faz
 * uma pessoa que passa o mouse por um instante antes de clicar.
 */
export async function waitForNetworkQuiet(page: Page, quietMs = 300) {
  let inFlight = 0;
  let lastChange = Date.now();
  const onRequest = () => {
    inFlight += 1;
    lastChange = Date.now();
  };
  const onDone = () => {
    inFlight = Math.max(0, inFlight - 1);
    lastChange = Date.now();
  };
  page.on("request", onRequest);
  page.on("requestfinished", onDone);
  page.on("requestfailed", onDone);
  try {
    await page.waitForTimeout(50);
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (inFlight === 0 && Date.now() - lastChange >= quietMs) return;
      await page.waitForTimeout(50);
    }
  } finally {
    page.off("request", onRequest);
    page.off("requestfinished", onDone);
    page.off("requestfailed", onDone);
  }
}
