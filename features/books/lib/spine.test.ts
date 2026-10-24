import { describe, expect, test } from "vitest";
import { neighborShift, spineHeight, spineWidth } from "./spine";

describe("spineWidth: proporcional às páginas, com limites", () => {
  test("sem número de páginas, vale um livro médio (280 páginas)", () => {
    expect(spineWidth(null)).toBe(30);
    expect(spineWidth(0)).toBe(30);
    expect(spineWidth(-12)).toBe(30);
  });

  test("cresce com as páginas", () => {
    expect(spineWidth(100)).toBe(21);
    expect(spineWidth(300)).toBe(31);
  });

  test("respeita mínimo e máximo", () => {
    expect(spineWidth(1)).toBe(18);
    expect(spineWidth(5000)).toBe(56);
  });
});

describe("spineHeight: varia pelo id, sempre igual para o mesmo livro", () => {
  test("fica entre 160 e 192, na grade de 4px", () => {
    for (let i = 0; i < 200; i++) {
      const height = spineHeight(`livro-${i}`);
      expect(height).toBeGreaterThanOrEqual(160);
      expect(height).toBeLessThanOrEqual(192);
      expect(height % 4).toBe(0);
    }
  });

  test("é determinística", () => {
    expect(spineHeight("torto-arado")).toBe(spineHeight("torto-arado"));
  });

  test("varia entre livros", () => {
    const heights = new Set(
      Array.from({ length: 50 }, (_, i) => spineHeight(`id-${i}`)),
    );
    expect(heights.size).toBeGreaterThan(4);
  });
});

describe("neighborShift: as vizinhas se afastam da lombada em destaque", () => {
  test("6, 4 e 2px conforme a distância, para o lado de fora", () => {
    expect(neighborShift(1)).toBe(6);
    expect(neighborShift(-1)).toBe(-6);
    expect(neighborShift(2)).toBe(4);
    expect(neighborShift(-3)).toBe(-2);
  });

  test("a própria lombada e as distantes não se mexem", () => {
    expect(neighborShift(0)).toBe(0);
    expect(neighborShift(4)).toBe(0);
    expect(neighborShift(-9)).toBe(0);
  });
});
