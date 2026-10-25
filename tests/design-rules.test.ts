import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, test } from "vitest";
import { INK_RGB, PAPER_RGB } from "@/features/books/lib/color";
import { COVER_RADIUS_PX } from "@/features/books/lib/cover";
import { spring } from "motion";
import { durations, easing, springs } from "@/lib/motion";

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

describe("foco visível (spec §8)", () => {
  // No Tailwind 4, outline-none/outline-hidden zeram --tw-outline-style, e
  // focus-visible:outline-2 desenha com esse estilo: o contorno some
  test("nenhuma classe apaga o contorno de foco", () => {
    const erased = files.flatMap((file) =>
      readFileSync(join(root, file), "utf8")
        .split("\n")
        .filter(
          (line) =>
            /\boutline-(?:none|hidden)\b/.test(line) &&
            /focus-visible:outline-(?:\d|\[)/.test(line) &&
            !/focus-visible:outline-solid\b/.test(line),
        )
        .map(() => file),
    );
    expect(erased).toEqual([]);
  });
});

// O contraste do texto sobre as capas é calculado com estas tintas
describe("tintas da capa no CSS espelham features/books/lib/color.ts", () => {
  const hex = (rgb: readonly number[]) =>
    `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

  test("--ink e --paper", () => {
    expect(css).toContain(`--ink: ${hex(INK_RGB)};`);
    expect(css).toContain(`--paper: ${hex(PAPER_RGB)};`);
  });
});

// Um navegador sem view-transition-class (Safari 18.0 e 18.1) descarta a
// lista inteira de seletores em que uma classe aparece: as regras genéricas
// (o movimento reduzido, por exemplo) ficariam sem efeito
test("nenhuma regra mistura pseudo-elementos genéricos de view transition com classes", () => {
  const mixed = [...css.matchAll(/([^{}]+)\{/g)]
    .map(([, selectors]) => selectors.trim())
    .filter(
      (selectors) =>
        selectors.includes("::view-transition") &&
        /\(\*\)/.test(selectors) &&
        /\(\./.test(selectors),
    );
  expect(mixed).toEqual([]);
});

// A capa viaja entre páginas com CSS: a curva tem de ser a mola smooth
describe("mola das transições entre páginas espelha lib/motion.ts", () => {
  const [duration, ...curve] = spring({
    keyframes: [0, 1],
    ...springs.smooth,
  })
    .toString()
    .split(" ");
  const steps = curve
    .join(" ")
    .replace(/^linear\(|\)$/g, "")
    .split(",")
    .map(Number);
  // O Prettier quebra o linear() em várias linhas: compara sem os espaços
  const flat = (text: string) =>
    text
      .replace(/\s+/g, " ")
      .replace(/\(\s/g, "(")
      .replace(/\s\)/g, ")")
      .replace(/,\s\)/g, ")");
  const linear = (values: number[]) =>
    `linear(${values.map((value) => String(Number(value.toFixed(4)))).join(", ")})`;

  test("--spring-smooth e a duração vêm da mola smooth do Motion", () => {
    expect(css).toContain(`--spring-smooth-duration: ${duration};`);
    expect(flat(css)).toContain(`--spring-smooth: ${flat(curve.join(" "))};`);
  });

  // Da lombada para a capa, o livro gira pela quina enquanto voa; o par
  // desliza para a quina ficar onde mantém o livro centrado no grupo. A conta
  // usa um livro típico (lombada de 32 × 176px, capa de 312px de altura) e a
  // perspectiva de 900px do CSS. Mudou a mola? Cole os valores esperados.
  test("--quina-ida e --quina-volta seguem a mola e a geometria do livro", () => {
    const [spine, height, cover, perspective] = [32, 176, 312, 900];
    // Onde fica a quina, em fração da largura do grupo, no progresso p da ida
    const corner = (p: number) => {
      const width = spine + p * ((2 / 3) * cover - spine);
      const h = height + p * (cover - height);
      const s = (spine / height) * h;
      const c = (2 / 3) * h;
      const angle = (Math.PI / 2) * p;
      // A borda livre de cada face se afasta e encolhe na perspectiva
      const seenSpine =
        (s * Math.cos(angle) * perspective) /
        (perspective + s * Math.sin(angle));
      const seenCover =
        (c * Math.sin(angle) * perspective) /
        (perspective + c * Math.cos(angle));
      return 0.5 + (seenSpine - seenCover) / (2 * width);
    };
    const progress = steps.map((p) => Math.min(1, Math.max(0, p)));
    const ida = progress.map((p) => 1 - corner(p));
    const volta = progress.map((p) => corner(1 - p));
    expect(flat(css)).toContain(`--quina-ida: ${linear(ida)};`);
    expect(flat(css)).toContain(`--quina-volta: ${linear(volta)};`);
  });
});
