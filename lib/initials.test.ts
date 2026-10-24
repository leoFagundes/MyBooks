import { describe, expect, test } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  test("primeira letra do primeiro e do último nome", () => {
    expect(initials("Ana Lívia Souza")).toBe("AS");
  });

  test("um nome só vira uma letra", () => {
    expect(initials("Machado")).toBe("M");
  });

  test("mantém acentos e ignora espaços sobrando", () => {
    expect(initials("  élida   ávila ")).toBe("ÉÁ");
  });

  test("nome vazio não quebra", () => {
    expect(initials("   ")).toBe("");
  });
});
