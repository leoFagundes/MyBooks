import { defineConfig } from "vitest/config";

// Testes de banco: SQL de verdade no projeto Supabase, dentro de transações
// desfeitas no fim. Precisam de rede e do SUPABASE_ACCESS_TOKEN.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    testTimeout: 60_000,
    fileParallelism: false,
  },
});
