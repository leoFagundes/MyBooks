import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes de banco: SQL de verdade no projeto Supabase, dentro de transações
// desfeitas no fim. Precisam de rede e do SUPABASE_ACCESS_TOKEN.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // O código de servidor (catálogo, chave secreta) roda aqui no Node puro
    alias: {
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    testTimeout: 60_000,
    fileParallelism: false,
  },
});
