import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Os testes criam e apagam contas pelo admin do Supabase (chave secreta só
// no Node dos testes, nunca no navegador)
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  // Na máquina de desenvolvimento (Windows), dois ou mais navegadores headless
  // ao mesmo tempo fazem as requisições para localhost pararem de chegar ao
  // servidor (medido até com um http.createServer puro). Localmente, um
  // navegador por vez; no CI, o padrão.
  workers: process.env.CI ? undefined : 1,
  reporter: "list",
  use: {
    baseURL,
    locale: "pt-BR",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    // Reaproveita o `npm run dev` que já estiver aberto: o Next não deixa
    // dois servidores de dev rodarem no mesmo projeto.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
