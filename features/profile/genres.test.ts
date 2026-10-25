import { describe, expect, test } from "vitest";
import { GENRE_SLUGS, GENRES, genreLabel } from "./genres";

describe("gêneros", () => {
  test("todo slug cabe na regra do banco (private.are_slugs)", () => {
    for (const slug of GENRE_SLUGS) {
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(slug.length).toBeLessThanOrEqual(40);
    }
  });

  test("slugs e rótulos não se repetem", () => {
    expect(new Set(GENRE_SLUGS).size).toBe(GENRES.length);
    expect(new Set(GENRES.map((genre) => genre.label)).size).toBe(
      GENRES.length,
    );
  });

  test("o rótulo vem pelo slug, e slug desconhecido não tem rótulo", () => {
    expect(genreLabel("literatura-brasileira")).toBe("Literatura brasileira");
    expect(genreLabel("ficcao-cientifica")).toBe("Ficção científica");
    expect(genreLabel("nao-existe")).toBeNull();
  });
});
