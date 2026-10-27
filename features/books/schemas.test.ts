import { describe, expect, test } from "vitest";
import { manualBookSchema } from "./schemas";

const fields = (overrides: Record<string, string>) => ({
  title: "Um Livro Meu",
  subtitle: "",
  authors: "",
  publishedYear: "",
  pageCount: "",
  isbn: "",
  ...overrides,
});
const parse = (overrides: Record<string, string>) =>
  manualBookSchema.safeParse(fields(overrides));

describe("cadastro manual", () => {
  test("título obrigatório e sem espaços sobrando", () => {
    expect(parse({ title: "   " }).success).toBe(false);
    expect(parse({ title: "  Um   Livro Meu " }).data?.title).toBe(
      "Um Livro Meu",
    );
    expect(parse({ title: "a".repeat(301) }).success).toBe(false);
  });

  test("autoria separada por vírgula vira lista", () => {
    expect(
      parse({ authors: "Ana Maria Machado, João Ubaldo " }).data?.authors,
    ).toEqual(["Ana Maria Machado", "João Ubaldo"]);
    expect(parse({ authors: "" }).data?.authors).toEqual([]);
    expect(
      parse({
        authors: Array.from({ length: 11 }, (_, i) => `Autor ${i}`).join(","),
      }).success,
    ).toBe(false);
  });

  test("ano e páginas são opcionais e cabem nos limites do catálogo", () => {
    expect(parse({}).data).toMatchObject({
      publishedYear: null,
      pageCount: null,
    });
    expect(
      parse({ publishedYear: "1899", pageCount: "256" }).data,
    ).toMatchObject({ publishedYear: 1899, pageCount: 256 });
    expect(parse({ publishedYear: "2101" }).success).toBe(false);
    expect(parse({ pageCount: "0" }).success).toBe(false);
    expect(parse({ pageCount: "duzentas" }).success).toBe(false);
  });

  test("ISBN com hífen vale e vira ISBN-13; dígito verificador errado não", () => {
    expect(parse({ isbn: "978-65-80309-31-3" }).data).toMatchObject({
      isbn13: "9786580309313",
      isbn10: null,
    });
    expect(parse({ isbn: "6580309318" }).data).toMatchObject({
      isbn13: "9786580309313",
      isbn10: "6580309318",
    });
    expect(parse({ isbn: "9786580309314" }).success).toBe(false);
    expect(parse({ isbn: "" }).data).toMatchObject({
      isbn13: null,
      isbn10: null,
    });
  });
});
