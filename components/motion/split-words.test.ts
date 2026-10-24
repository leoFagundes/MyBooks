import { describe, expect, test } from "vitest";
import { splitWords } from "./split-words";

describe("splitWords", () => {
  test("separa por espaço mantendo a pontuação colada", () => {
    expect(splitWords("Sua vida de leitor, em uma estante só.")).toEqual([
      "Sua",
      "vida",
      "de",
      "leitor,",
      "em",
      "uma",
      "estante",
      "só.",
    ]);
  });

  test("ignora espaços repetidos e nas pontas", () => {
    expect(splitWords("  dois   espaços \n quebra ")).toEqual([
      "dois",
      "espaços",
      "quebra",
    ]);
  });

  test("texto vazio vira lista vazia", () => {
    expect(splitWords("")).toEqual([]);
    expect(splitWords("   ")).toEqual([]);
  });
});
