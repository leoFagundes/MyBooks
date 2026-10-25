import { describe, expect, test } from "vitest";
import {
  BOOK_LIMITS,
  cleanList,
  cleanText,
  dedupeResults,
  isbn10To13,
  pickIsbns,
  type SearchResult,
  toLanguage,
} from "./search-result";

const result = (overrides: Partial<SearchResult>): SearchResult => ({
  source: "openlibrary",
  sourceId: "OL1W",
  title: "Dom Casmurro",
  subtitle: null,
  authors: ["Machado de Assis"],
  publishedYear: 1899,
  pageCount: null,
  isbn13: null,
  isbn10: null,
  language: "pt",
  genres: [],
  coverUrl: null,
  ...overrides,
});

const cover = "https://covers.openlibrary.org/b/id/1-L.jpg";

describe("ISBN", () => {
  test("o ISBN-10 vira o ISBN-13 da mesma edição", () => {
    expect(isbn10To13("0306406152")).toBe("9780306406157");
    expect(isbn10To13("080442957X")).toBe("9780804429573");
  });

  test("dígito verificador errado fica de fora", () => {
    expect(pickIsbns(["9780306406158", "0306406153"])).toEqual({
      isbn13: null,
      isbn10: null,
    });
  });

  test("prefere a edição brasileira e o ISBN-10 dela", () => {
    // ISBNs reais de Torto Arado: edições inglesa, brasileira e portuguesa
    const isbns = [
      "1839766409",
      "9781839766428",
      "9781839766404",
      "6580309318",
      "9786580309313",
      "1839766425",
      "9896605777",
      "9789896605773",
    ];
    expect(pickIsbns(isbns)).toEqual({
      isbn13: "9786580309313",
      isbn10: "6580309318",
    });
  });

  test("só ISBN-10, com hífens e X: o ISBN-13 sai dele", () => {
    expect(pickIsbns(["0-8044-2957-X"])).toEqual({
      isbn13: "9780804429573",
      isbn10: "080442957X",
    });
  });
});

describe("texto", () => {
  test("espaços sobrando somem e texto vazio vira null", () => {
    expect(cleanText("  dom   casmurro ", BOOK_LIMITS.title)).toBe(
      "dom casmurro",
    );
    expect(cleanText("   ", BOOK_LIMITS.title)).toBeNull();
    expect(cleanText(undefined, BOOK_LIMITS.title)).toBeNull();
    expect(cleanText(42, BOOK_LIMITS.title)).toBeNull();
  });

  test("além do limite, corta numa palavra e termina com reticências", () => {
    const cut = cleanText("palavra ".repeat(60), BOOK_LIMITS.title) ?? "";
    expect([...cut].length).toBeLessThanOrEqual(BOOK_LIMITS.title);
    expect(cut).toMatch(/ palavra…$/);
  });

  test("conta caracteres, não unidades UTF-16", () => {
    const cut = cleanText("📚".repeat(310), BOOK_LIMITS.title) ?? "";
    expect([...cut].length).toBe(BOOK_LIMITS.title);
  });

  test("listas sem vazios nem repetidos; a grafia com acento vence", () => {
    expect(
      cleanList(
        ["Itamar Vieira Junior", "Itamar Vieira Júnior", " ", null, "Outra"],
        BOOK_LIMITS.authors,
        BOOK_LIMITS.author,
      ),
    ).toEqual(["Itamar Vieira Júnior", "Outra"]);
  });

  test("listas respeitam o limite de itens e deixam de fora o que é longo demais", () => {
    const many = Array.from({ length: 12 }, (_, i) => `Gênero ${i}`);
    expect(cleanList(many, BOOK_LIMITS.genres, BOOK_LIMITS.genre)).toHaveLength(
      BOOK_LIMITS.genres,
    );
    expect(
      cleanList(["x".repeat(BOOK_LIMITS.genre + 1), "Ficção"], 8, 60),
    ).toEqual(["Ficção"]);
  });
});

describe("idioma", () => {
  test("código MARC vira ISO 639-1, e o português tem preferência", () => {
    expect(toLanguage(["eng", "por", "fre"])).toBe("pt");
    expect(toLanguage(["fre", "eng"])).toBe("fr");
  });

  test("pt-BR vira pt", () => {
    expect(toLanguage(["pt-BR"])).toBe("pt");
  });

  test("código desconhecido ou ausente fica null", () => {
    expect(toLanguage(["zzz"])).toBeNull();
    expect(toLanguage([])).toBeNull();
  });
});

describe("dedupeResults", () => {
  test("a mesma obra fica uma vez, no lugar da primeira, e quem tem capa vence", () => {
    const results = [
      result({ sourceId: "OL1W" }),
      result({
        sourceId: "OL2W",
        title: "Sapiens",
        authors: ["Yuval Noah Harari"],
      }),
      result({
        sourceId: "OL3W",
        title: "dom casmurro ",
        authors: ["Machado Assis"],
        coverUrl: cover,
      }),
    ];
    expect(dedupeResults(results).map((r) => r.sourceId)).toEqual([
      "OL3W",
      "OL2W",
    ]);
  });

  test("o mesmo ISBN-13 vindo de fontes diferentes fica uma vez", () => {
    const results = [
      result({
        source: "google",
        sourceId: "g1",
        title: "Torto arado",
        authors: ["Itamar Vieira Junior"],
        isbn13: "9786580309313",
      }),
      result({
        sourceId: "OL24141556W",
        title: "Torto Arado (edição especial)",
        authors: [],
        isbn13: "9786580309313",
      }),
    ];
    expect(dedupeResults(results)).toHaveLength(1);
  });

  test("o livro que já está no catálogo vence, mesmo sem capa", () => {
    const results = [
      result({ sourceId: "OL1W", coverUrl: cover }),
      result({ sourceId: "OL9W", catalogId: "c0ffee" }),
    ];
    expect(dedupeResults(results)).toEqual([
      expect.objectContaining({ catalogId: "c0ffee" }),
    ]);
  });

  test("títulos iguais sem autor não se juntam", () => {
    const results = [
      result({ sourceId: "OL1M", authors: [] }),
      result({ sourceId: "OL2M", authors: [] }),
    ];
    expect(dedupeResults(results)).toHaveLength(2);
  });
});
