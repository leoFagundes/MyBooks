import { describe, expect, test } from "vitest";
import {
  addBookSchema,
  ratingSchema,
  shelfDetailsSchema,
  shelfEntrySchema,
} from "./schemas";

const BOOK = "68c7e16e-6b1e-54f7-9662-e4122baaaf7a";

describe("livro na estante", () => {
  test("status só entre lido, lendo, quero ler e abandonado", () => {
    for (const status of ["read", "reading", "want", "abandoned"]) {
      expect(shelfEntrySchema.safeParse({ bookId: BOOK, status }).success).toBe(
        true,
      );
    }
    expect(
      shelfEntrySchema.safeParse({ bookId: BOOK, status: "lendo" }).success,
    ).toBe(false);
  });

  test("o livro vem pelo id do catálogo", () => {
    expect(
      shelfEntrySchema.safeParse({ bookId: "dom-casmurro", status: "want" })
        .success,
    ).toBe(false);
  });
});

describe("nota", () => {
  test("de 0,5 a 5, em meias estrelas", () => {
    for (const rating of [0.5, 1, 3.5, 5]) {
      expect(ratingSchema.safeParse(rating).success).toBe(true);
    }
    for (const rating of [0, -1, 5.5, 3.3, Number.NaN]) {
      expect(ratingSchema.safeParse(rating).success).toBe(false);
    }
  });
});

const details = (overrides: Record<string, unknown>) => ({
  status: "read",
  rating: null,
  startedAt: null,
  finishedAt: null,
  ...overrides,
});
const valid = (overrides: Record<string, unknown>) =>
  shelfDetailsSchema.safeParse(details(overrides)).success;

describe("status, nota e datas", () => {
  test("quero ler não tem nota nem datas", () => {
    expect(valid({ status: "want" })).toBe(true);
    expect(valid({ status: "want", rating: 4 })).toBe(false);
    expect(valid({ status: "want", startedAt: "2026-10-01" })).toBe(false);
  });

  test("lendo tem início, e não fim", () => {
    expect(valid({ status: "reading", startedAt: "2026-10-01" })).toBe(true);
    expect(valid({ status: "reading", finishedAt: "2026-10-01" })).toBe(false);
  });

  test("lido e abandonado levam nota e as duas datas, com o fim depois do início", () => {
    expect(
      valid({ rating: 4.5, startedAt: "2026-09-01", finishedAt: "2026-10-01" }),
    ).toBe(true);
    expect(
      valid({
        status: "abandoned",
        startedAt: "2026-10-01",
        finishedAt: "2026-10-01",
      }),
    ).toBe(true);
    expect(valid({ startedAt: "2026-10-10", finishedAt: "2026-10-01" })).toBe(
      false,
    );
  });

  test("data no formato do banco, que existe e não está no futuro", () => {
    expect(valid({ finishedAt: "27/10/2026" })).toBe(false);
    expect(valid({ finishedAt: "2026-02-30" })).toBe(false);
    expect(valid({ finishedAt: "2999-01-01" })).toBe(false);
  });
});

describe("livro a adicionar", () => {
  const add = (book: unknown) =>
    addBookSchema.safeParse({ book, details: details({ status: "want" }) })
      .success;

  test("do catálogo pelo id, ou de uma fonte com a busca que o achou", () => {
    expect(add({ catalogId: BOOK })).toBe(true);
    expect(
      add({
        source: "openlibrary",
        sourceId: "OL1003040W",
        query: "dom casmurro",
      }),
    ).toBe(true);
    expect(add({ source: "google", sourceId: "abc123", query: "torto" })).toBe(
      true,
    );
  });

  test("nada de dados do livro vindos do cliente, nem fonte manual", () => {
    expect(add({ catalogId: "dom-casmurro" })).toBe(false);
    expect(add({ source: "openlibrary", sourceId: "OL1003040W" })).toBe(false);
    expect(add({ source: "manual", sourceId: BOOK, query: "dom" })).toBe(false);
  });
});
