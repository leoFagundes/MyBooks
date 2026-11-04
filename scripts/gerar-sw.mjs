// Roda depois do next build (postbuild): empacota o service worker
// (features/pwa/worker/sw.ts) e grava nele a lista do precache, em
// public/sw.js. O @serwist/turbopack monta o arquivo num Route Handler
// force-static, que não convive com o Cache Components; aqui ele sai pronto,
// como um arquivo estático.

import { injectManifest } from "@serwist/build";
import { build } from "esbuild";
import { readFile, rm } from "node:fs/promises";

const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
const bundle = ".next/sw.bundle.js";

await build({
  entryPoints: ["features/pwa/worker/sw.ts"],
  outfile: bundle,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2022",
  minify: true,
  legalComments: "none",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});

const { count, size, warnings } = await injectManifest({
  swSrc: bundle,
  swDest: "public/sw.js",
  globDirectory: ".next",
  // Só o que a página offline precisa para se desenhar sem o JavaScript: os
  // estilos e as fontes. Os scripts entram no cache conforme são usados.
  globPatterns: ["static/**/*.css", "static/media/*.woff2"],
  modifyURLPrefix: { "static/": "/_next/static/" },
  dontCacheBustURLsMatching: /^\/_next\/static\//,
  additionalPrecacheEntries: [{ url: "/sem-conexao", revision: buildId }],
});
await rm(bundle);

for (const warning of warnings) console.warn(`Service worker: ${warning}`);
console.log(
  `Service worker em public/sw.js: ${count} arquivos no precache (${(size / 1024).toFixed(0)} KiB).`,
);
