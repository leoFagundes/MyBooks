import { describe, expect, test } from "vitest";
import { normalizeUsername, typedUsername } from "./username";

describe("normalizeUsername", () => {
  test("tira @, acento e espaços e deixa minúsculo", () => {
    expect(normalizeUsername(" @Ana Lívia ")).toBe("ana_livia");
    expect(normalizeUsername("João.Pedro")).toBe("joao_pedro");
  });

  test("não deixa _ sobrando nas pontas nem repetido", () => {
    expect(normalizeUsername("__ana__lê__")).toBe("ana_le");
    expect(normalizeUsername("ana!!!")).toBe("ana");
  });

  test("corta em 20 caracteres", () => {
    expect(normalizeUsername("maria clara dos anjos bittencourt")).toBe(
      "maria_clara_dos_anjo",
    );
  });
});

describe("typedUsername, enquanto a pessoa digita", () => {
  test("espaço, ponto e hífen viram _, sem cortar o _ do fim", () => {
    expect(typedUsername("Ana ")).toBe("ana_");
    expect(typedUsername("ana-livia")).toBe("ana_livia");
    expect(typedUsername("ana.l")).toBe("ana_l");
  });

  test("tira @, acento e o que não cabe num @", () => {
    expect(typedUsername("@Lívia")).toBe("livia");
    expect(typedUsername("ana💜")).toBe("ana");
    expect(typedUsername("a".repeat(25))).toBe("a".repeat(20));
  });
});
