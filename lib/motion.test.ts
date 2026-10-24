import { describe, expect, test } from "vitest";
import {
  durations,
  easing,
  entranceTransition,
  entranceVariants,
  overlayVariants,
  pressScale,
  sheetVariants,
  springs,
  staggerDelay,
  tweens,
} from "./motion";

describe("presets de movimento (spec §3)", () => {
  test("molas snappy, smooth e gentle com os valores da spec", () => {
    expect(springs.snappy).toEqual({
      type: "spring",
      bounce: 0,
      visualDuration: 0.2,
    });
    expect(springs.smooth).toEqual({
      type: "spring",
      bounce: 0.15,
      visualDuration: 0.4,
    });
    expect(springs.gentle).toEqual({
      type: "spring",
      bounce: 0.25,
      visualDuration: 0.6,
    });
  });

  test("curva e durações das transições sem mola", () => {
    expect(easing).toEqual([0.22, 1, 0.36, 1]);
    expect(durations).toEqual({ fast: 0.15, base: 0.25, slow: 0.4 });
    expect(tweens.fast).toEqual({ duration: 0.15, ease: [0.22, 1, 0.36, 1] });
    expect(tweens.base).toEqual({ duration: 0.25, ease: [0.22, 1, 0.36, 1] });
    expect(tweens.slow).toEqual({ duration: 0.4, ease: [0.22, 1, 0.36, 1] });
  });

  test("sequência de 35ms e botão que encolhe para 0.97", () => {
    expect(staggerDelay).toBe(0.035);
    expect(pressScale).toBe(0.97);
  });
});

describe("entradas", () => {
  test("entram com fade, 8px para cima e blur de 4px para 0", () => {
    expect(entranceVariants.hidden).toEqual({
      opacity: 0,
      y: 8,
      filter: "blur(4px)",
    });
    expect(entranceVariants.visible).toEqual({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
    });
  });

  test("com movimento reduzido, posição e desfoque vão direto ao fim", () => {
    expect(entranceTransition(true, tweens.slow)).toEqual({
      ...tweens.slow,
      y: { duration: 0 },
      filter: { duration: 0 },
    });
  });

  test("com movimento normal, a transição fica como veio", () => {
    expect(entranceTransition(false, tweens.slow)).toEqual(tweens.slow);
  });
});

describe("overlayVariants", () => {
  test("entra de 0.96 para 1 com fade, usando a mola smooth", () => {
    const variants = overlayVariants(false);
    expect(variants.hidden).toMatchObject({ opacity: 0, scale: 0.96 });
    expect(variants.visible).toMatchObject({
      opacity: 1,
      scale: 1,
      transition: springs.smooth,
    });
  });

  test("sai mais rápido do que entra", () => {
    const variants = overlayVariants(false);
    const exit = variants.exit as { transition: { duration: number } };
    expect(exit.transition.duration).toBeLessThan(
      springs.smooth.visualDuration,
    );
  });

  test("com movimento reduzido não usa escala", () => {
    const variants = overlayVariants(true);
    expect(variants.hidden).toEqual({ opacity: 0 });
    expect(variants.visible).toMatchObject({ opacity: 1 });
    expect(variants.visible).not.toHaveProperty("scale");
    expect(variants.exit).not.toHaveProperty("scale");
  });
});

describe("sheetVariants", () => {
  test("a gaveta de baixo entra deslizando de fora da tela", () => {
    const variants = sheetVariants("bottom", false);
    expect(variants.hidden).toMatchObject({ y: "100%" });
    expect(variants.visible).toMatchObject({
      y: 0,
      transition: springs.smooth,
    });
  });

  test("a gaveta lateral entra pela direita", () => {
    const variants = sheetVariants("right", false);
    expect(variants.hidden).toMatchObject({ x: "100%" });
    expect(variants.visible).toMatchObject({ x: 0 });
  });

  test("com movimento reduzido a gaveta só aparece e some", () => {
    const variants = sheetVariants("bottom", true);
    expect(variants.hidden).toEqual({ opacity: 0 });
    expect(variants.visible).not.toHaveProperty("y");
  });
});
