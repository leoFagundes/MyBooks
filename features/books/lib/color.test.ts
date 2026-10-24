import { describe, expect, test } from "vitest";
import {
  bookColor,
  contrastRatio,
  generatedCoverColor,
  hslToHex,
  pickInk,
  relativeLuminance,
} from "./color";

// Os mesmos valores dos tokens --ink e --paper do app/globals.css
const INK = "#111110";
const PAPER = "#ededea";

describe("relativeLuminance (WCAG)", () => {
  test("branco e preto nos extremos", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBe(0);
  });

  test("aceita hex curto e maiúsculas", () => {
    expect(relativeLuminance("#FFF")).toBeCloseTo(1, 5);
  });
});

describe("contrastRatio", () => {
  test("preto no branco é 21:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });
});

describe("pickInk", () => {
  test("fundo claro pede tinta escura", () => {
    expect(pickInk("#f5e6c8")).toBe("ink");
  });

  test("fundo escuro pede tinta clara", () => {
    expect(pickInk("#1f2a44")).toBe("paper");
  });
});

describe("hslToHex", () => {
  test("cores conhecidas", () => {
    expect(hslToHex(0, 100, 50)).toBe("#ff0000");
    expect(hslToHex(120, 100, 25)).toBe("#008000");
    expect(hslToHex(0, 0, 100)).toBe("#ffffff");
  });
});

describe("generatedCoverColor", () => {
  test("o mesmo título dá sempre a mesma cor", () => {
    expect(generatedCoverColor("Grande Sertão: Veredas")).toBe(
      generatedCoverColor("Grande Sertão: Veredas"),
    );
  });

  test("é sempre um hex válido, com acento, emoji ou vazio", () => {
    for (const title of ["", "Ação e reação", "São Bernardo", "🙂"]) {
      expect(generatedCoverColor(title)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  test("títulos diferentes costumam dar cores diferentes", () => {
    const titles = Array.from({ length: 40 }, (_, i) => `Livro número ${i}`);
    expect(new Set(titles.map(generatedCoverColor)).size).toBeGreaterThan(24);
  });

  test("o título fica legível: contraste ≥ 4,5 com a tinta escolhida", () => {
    for (let i = 0; i < 720; i++) {
      const color = generatedCoverColor(`Título ${i}`);
      const ink = pickInk(color) === "ink" ? INK : PAPER;
      expect(contrastRatio(color, ink)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("bookColor", () => {
  test("usa a cor da capa quando existe", () => {
    expect(bookColor({ title: "Duna", coverColor: "#695e1b" })).toBe("#695e1b");
  });

  test("sem cor de capa, gera pelo título", () => {
    expect(bookColor({ title: "Duna", coverColor: null })).toBe(
      generatedCoverColor("Duna"),
    );
  });
});
