import { describe, expect, test } from "vitest";
import { toBookVisual } from "./to-book-visual";

const row = {
  id: "68c7e16e-6b1e-54f7-9662-e4122baaaf7a",
  title: "Dom Casmurro",
  authors: ["Machado de Assis"],
  cover_url: "https://covers.openlibrary.org/b/id/647501-L.jpg",
  cover_color: "#ecc404",
  page_count: 268,
  published_year: 1899,
};

describe("toBookVisual", () => {
  test("a linha do catálogo vira o que as capas e lombadas desenham", () => {
    expect(toBookVisual(row)).toEqual({
      id: row.id,
      title: "Dom Casmurro",
      authors: ["Machado de Assis"],
      coverUrl: "https://covers.openlibrary.org/b/id/647501-L.jpg",
      coverColor: "#ecc404",
      pageCount: 268,
      publishedYear: 1899,
    });
  });

  test("cor fora do formato vira null (ela vai para o style)", () => {
    expect(toBookVisual({ ...row, cover_color: "red" }).coverColor).toBeNull();
    expect(
      toBookVisual({ ...row, cover_color: "#ecc404;background:url(x)" })
        .coverColor,
    ).toBeNull();
    expect(toBookVisual({ ...row, cover_color: null }).coverColor).toBeNull();
  });

  test("sem autores, lista vazia; sem capa conhecida, capa tipográfica", () => {
    expect(toBookVisual({ ...row, authors: [] }).authors).toEqual([]);
    expect(toBookVisual({ ...row, cover_url: null }).coverUrl).toBeNull();
    expect(
      toBookVisual({ ...row, cover_url: "https://exemplo.com/capa.jpg" })
        .coverUrl,
    ).toBeNull();
  });
});
