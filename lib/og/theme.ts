import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INK_RGB, PAPER_RGB, toHex } from "@/features/books/lib/color";

// As imagens não leem o CSS: as cores vêm dos tokens do tema claro no
// globals.css, que é a única fonte delas (spec §2)
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const light =
  /:root,\s*\[data-theme="light"\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";

function token(name: string) {
  const value = new RegExp(`${name}:\s*([^;]+);`).exec(light)?.[1]?.trim();
  if (!value) throw new Error(`O token ${name} sumiu do globals.css`);
  return value;
}

/** As cores do tema claro, para as imagens de compartilhamento. */
export const ogColors = {
  background: token("--background"),
  surface: token("--surface"),
  border: token("--border"),
  foreground: token("--foreground"),
  muted: token("--muted-foreground"),
  brand: token("--brand"),
  ink: toHex(INK_RGB),
  paper: toHex(PAPER_RGB),
};
