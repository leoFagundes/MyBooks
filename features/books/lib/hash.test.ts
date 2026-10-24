import { describe, expect, test } from "vitest";
import { hashString } from "./hash";

describe("hashString (FNV-1a de 32 bits)", () => {
  test("bate com os vetores de teste do FNV-1a", () => {
    expect(hashString("")).toBe(0x811c9dc5);
    expect(hashString("a")).toBe(0xe40c292c);
    expect(hashString("foobar")).toBe(0xbf9cf968);
  });

  test("é sempre um inteiro sem sinal", () => {
    for (const text of [
      "Torto Arado",
      "Grande Sertão: Veredas",
      "🙂",
      "a".repeat(500),
    ]) {
      const hash = hashString(text);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThan(2 ** 32);
    }
  });
});
