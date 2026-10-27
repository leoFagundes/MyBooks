import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { findLeaks, SECRET_KEY_PATTERN } from "./verificar-bundle.mjs";

let dir: string | undefined;

async function bundle(files: Record<string, string>) {
  dir = await mkdtemp(path.join(tmpdir(), "mybooks-bundle-"));
  for (const [name, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, name)), { recursive: true });
    await writeFile(path.join(dir, name), content);
  }
  return dir;
}

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

// Formato de uma chave secreta do Supabase (valor inventado)
const FAKE_KEY = `sb_secret_${"Ab1-_".repeat(6)}x`;

describe("varredura do bundle", () => {
  test("acha uma chave secreta em qualquer pasta do bundle", async () => {
    const root = await bundle({
      "chunks/app.js": `const key = "${FAKE_KEY}";`,
      "chunks/outro.js": "console.log(1);",
    });
    expect(await findLeaks(root, [SECRET_KEY_PATTERN])).toEqual([
      path.join(root, "chunks", "app.js"),
    ]);
  });

  test("a checagem de formato do supabase-js (só o prefixo) não é vazamento", async () => {
    const root = await bundle({
      "chunks/supabase.js":
        'const isKey = (e) => e.startsWith("sb_publishable_") || e.startsWith("sb_secret_");',
    });
    expect(await findLeaks(root, [SECRET_KEY_PATTERN])).toEqual([]);
  });

  test("acha o valor exato de um segredo do .env.local", async () => {
    const root = await bundle({
      "chunks/app.js": 'fetch(u, { token: "sbp_123abc" });',
    });
    expect(await findLeaks(root, ["sbp_123abc"])).toEqual([
      path.join(root, "chunks", "app.js"),
    ]);
  });

  test("bundle limpo passa, e agulha vazia não conta", async () => {
    const root = await bundle({ "chunks/app.js": "export const a = 1;" });
    expect(await findLeaks(root, [SECRET_KEY_PATTERN, "", undefined])).toEqual(
      [],
    );
  });
});
