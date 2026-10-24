import { describe, expect, test } from "vitest";
import { shouldDismissSheet } from "./sheet-gesture";

// offset e velocity medidos na direção em que a gaveta sai (para baixo = positivo)
describe("shouldDismissSheet", () => {
  const size = 600;

  test("fecha quando arrastada 30% do tamanho", () => {
    expect(shouldDismissSheet({ offset: 180, velocity: 0, size })).toBe(true);
  });

  test("não fecha com pouco arrasto e pouca velocidade", () => {
    expect(shouldDismissSheet({ offset: 170, velocity: 100, size })).toBe(
      false,
    );
  });

  test("fecha com um gesto rápido para fora, mesmo curto", () => {
    expect(shouldDismissSheet({ offset: 12, velocity: 600, size })).toBe(true);
  });

  test("não fecha com gesto rápido na direção contrária", () => {
    expect(shouldDismissSheet({ offset: 12, velocity: -800, size })).toBe(
      false,
    );
  });

  test("um puxão de volta vence o arrasto longo", () => {
    expect(shouldDismissSheet({ offset: 240, velocity: -900, size })).toBe(
      false,
    );
  });
});
