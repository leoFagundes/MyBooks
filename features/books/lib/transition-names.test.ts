import { describe, expect, test } from "vitest";
import { coverName, titleName } from "./transition-names";

describe("nomes da viagem da capa", () => {
  test("UUID e slug já são nomes válidos e ficam como estão", () => {
    expect(coverName("torto-arado")).toBe("capa-torto-arado");
    expect(titleName("3f2b8c1e-9a4d-4f6e-8b2a-1c3d5e7f9a0b")).toBe(
      "titulo-3f2b8c1e-9a4d-4f6e-8b2a-1c3d5e7f9a0b",
    );
  });

  test("caractere fora de [a-z0-9-] vira um nome de CSS válido", () => {
    expect(coverName("o pequeno/príncipe")).toMatch(/^capa-[A-Za-z0-9_-]+$/);
  });

  test("ids diferentes nunca dão o mesmo nome", () => {
    const ids = ["a/b", "a_b", "a b", "a_2f_b", "a-b"];
    expect(new Set(ids.map(coverName)).size).toBe(ids.length);
  });
});
