// Roda depois do next build (postbuild): nenhuma chave secreta pode estar
// nos arquivos que vão para o navegador (.next/static).

import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Arquivos de `dir` que contêm alguma das agulhas (vazias não contam).
 * @param {string} dir
 * @param {(string | undefined)[]} needles
 * @returns {Promise<string[]>}
 */
export async function findLeaks(dir, needles) {
  const wanted = needles.filter((needle) => Boolean(needle));
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  const leaks = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath, entry.name);
    const text = await readFile(file, "utf8");
    if (wanted.some((needle) => text.includes(needle))) leaks.push(file);
  }
  return leaks.sort();
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const leaks = await findLeaks(path.join(".next", "static"), [
    "sb_secret_",
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_ACCESS_TOKEN,
  ]);
  if (leaks.length > 0) {
    console.error(`Chave secreta no bundle do navegador:\n${leaks.join("\n")}`);
    process.exit(1);
  }
  console.log("Bundle do navegador sem chaves secretas.");
}
