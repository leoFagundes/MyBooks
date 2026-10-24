import { describe, expect, test } from "vitest";
import imageLoader from "./image-loader";

const cover = "https://covers.openlibrary.org/b/id/647501-L.jpg";

describe("imageLoader", () => {
  test("escolhe o menor tamanho da Open Library que cobre a largura (S 38, M 180, L 333)", () => {
    expect(imageLoader({ src: cover, width: 32 })).toBe(
      "https://covers.openlibrary.org/b/id/647501-S.jpg?w=32",
    );
    expect(imageLoader({ src: cover, width: 128 })).toBe(
      "https://covers.openlibrary.org/b/id/647501-M.jpg?w=128",
    );
    expect(imageLoader({ src: cover, width: 180 })).toBe(
      "https://covers.openlibrary.org/b/id/647501-M.jpg?w=180",
    );
    expect(imageLoader({ src: cover, width: 640 })).toBe(
      "https://covers.openlibrary.org/b/id/647501-L.jpg?w=640",
    );
  });

  test("funciona com capas por ISBN e OLID", () => {
    expect(
      imageLoader({
        src: "https://covers.openlibrary.org/b/isbn/9788535902778-M.jpg",
        width: 96,
      }),
    ).toBe("https://covers.openlibrary.org/b/isbn/9788535902778-M.jpg?w=96");
    expect(
      imageLoader({
        src: "https://covers.openlibrary.org/b/olid/OL7353617M-S.jpg",
        width: 400,
      }),
    ).toBe("https://covers.openlibrary.org/b/olid/OL7353617M-L.jpg?w=400");
  });

  test("outras imagens passam direto, só com a largura na URL", () => {
    expect(imageLoader({ src: "/capas/exemplo.jpg", width: 320 })).toBe(
      "/capas/exemplo.jpg?w=320",
    );
    expect(
      imageLoader({
        src: "https://books.google.com/x?id=1&zoom=1",
        width: 320,
      }),
    ).toBe("https://books.google.com/x?id=1&zoom=1&w=320");
  });
});
