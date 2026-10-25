import { describe, expect, test } from "vitest";
import { shelfEntrySchema } from "./schemas";

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
