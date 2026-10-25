import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { findLeaks } from "./verificar-bundle.mjs";

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

describe("varredura do bundle", () => {
  test("acha a chave secreta em qualquer pasta do bundle", async () => {
    const root = await bundle({
      "chunks/app.js": 'const key = "sb_secret_abc123";',
      "chunks/outro.js": "console.log(1);",
    });
    expect(await findLeaks(root, ["sb_secret_"])).toEqual([
      path.join(root, "chunks", "app.js"),
    ]);
  });

  test("bundle limpo passa, e agulha vazia não conta", async () => {
    const root = await bundle({ "chunks/app.js": "export const a = 1;" });
    expect(await findLeaks(root, ["sb_secret_", "", undefined])).toEqual([]);
  });
});
