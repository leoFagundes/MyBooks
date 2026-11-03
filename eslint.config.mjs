import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // O service worker gerado no postbuild (o código está em features/pwa)
    "public/sw.js",
    // Artefatos de teste e do fluxo de planos
    "test-results/**",
    "playwright-report/**",
    "blob-report/**",
    ".superpowers/**",
  ]),
]);

export default eslintConfig;
