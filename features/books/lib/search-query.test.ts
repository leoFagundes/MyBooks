import { describe, expect, test } from "vitest";
import { normalizeQuery } from "./search-query";

describe("consulta da busca", () => {
  test("sem espaço sobrando e minúscula: a mesma busca usa o mesmo cache", () => {
    expect(normalizeQuery("  Grande   Sertão ")).toBe("grande sertão");
    expect(normalizeQuery("DUNA")).toBe("duna");
  });

  test("corta em 100 caracteres", () => {
    expect(normalizeQuery("a".repeat(150))).toHaveLength(100);
  });

  test("vazia continua vazia", () => {
    expect(normalizeQuery("   ")).toBe("");
  });
});
