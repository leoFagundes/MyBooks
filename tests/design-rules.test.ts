import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";
import { COVER_RADIUS_PX } from "@/features/books/lib/cover";
import { durations, easing } from "@/lib/motion";

const root = join(__dirname, "..");
const css = readFileSync(join(root, "app/globals.css"), "utf8");

// Dados reais de livros (cores extraídas das capas) não são cores de interface.
const dataFixtures = new Set(["features/books/sample-books.ts"]);

function sourceFiles(dir: string): string[] {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((name) => {
    const path = join(abs, name);
    if (statSync(path).isDirectory()) return sourceFiles(relative(root, path));
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)
      ? [relative(root, path)]
      : [];
  });
}

const files = ["app", "components", "features", "lib"]
  .flatMap(sourceFiles)
  .map((file) => file.split(sep).join("/"))
  .filter((file) => !dataFixtures.has(file));

function offenders(pattern: RegExp) {
  return files.filter((file) =>
    pattern.test(readFileSync(join(root, file), "utf8")),
  );
}

// Primeiro bloco cuja lista de seletores inclui `selector` (ex.: ":root, [data-theme] {").
function block(selector: string) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g);
  for (const [, selectors, body] of blocks) {
    if (selectors.split(",").some((s) => s.trim() === selector)) return body;
  }
  throw new Error(`bloco ${selector} não encontrado no globals.css`);
}

describe("nenhuma cor solta no código (spec §2)", () => {
  test("sem hex nem funções de cor em .ts/.tsx", () => {
    expect(offenders(/#[0-9a-fA-F]{3,8}\b/)).toEqual([]);
    expect(
      offenders(/\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/),
    ).toEqual([]);
  });

  test("sem classes da paleta padrão do Tailwind", () => {
    const palette =
      /\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow|accent|caret|divide|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
    const blackWhite =
      /\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline)-(?:black|white)\b/;
    expect(offenders(palette)).toEqual([]);
    expect(offenders(blackWhite)).toEqual([]);
  });

  test("a paleta padrão do Tailwind está desligada", () => {
    expect(css).toMatch(/--color-\*:\s*initial/);
  });
});

describe("tokens de cor (spec §2)", () => {
  const light = {
    "--background": "#fafaf8",
    "--surface": "#ffffff",
    "--border": "#eaeae6",
    "--border-strong": "#8f8f8a",
    "--foreground": "#111110",
    "--muted-foreground": "#6e6e69",
    "--brand": "#d9541e",
  };
  const dark = {
    "--background": "#0b0b0a",
    "--surface": "#141413",
    "--border": "#22221f",
    "--border-strong": "#66665f",
    "--foreground": "#ededea",
    "--muted-foreground": "#8b8b86",
    "--brand": "#f07040",
  };

  test.each(Object.entries(light))("claro: %s é %s", (name, hex) => {
    expect(block(":root").toLowerCase()).toContain(`${name}: ${hex};`);
  });

  test.each(Object.entries(dark))("escuro: %s é %s", (name, hex) => {
    expect(block('[data-theme="dark"]').toLowerCase()).toContain(
      `${name}: ${hex};`,
    );
  });

  test("a variante dark segue o data-theme do <html>", () => {
    expect(css).toContain(
      '@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));',
    );
  });
});

describe("movimento no CSS espelha lib/motion.ts", () => {
  test("mesma curva", () => {
    expect(css).toContain(
      `--ease-standard: cubic-bezier(${easing.join(", ")});`,
    );
  });

  test("mesmas durações", () => {
    expect(css).toContain(`--duration-fast: ${durations.fast * 1000}ms;`);
    expect(css).toContain(`--duration-base: ${durations.base * 1000}ms;`);
    expect(css).toContain(`--duration-slow: ${durations.slow * 1000}ms;`);
  });
});

// O Motion só corrige o raio durante a animação de layout com valor em px
describe("raio da capa no CSS espelha features/books/lib/cover.ts", () => {
  test("mesmo valor em px", () => {
    expect(css).toContain(`--radius-cover: ${COVER_RADIUS_PX}px;`);
  });
});
