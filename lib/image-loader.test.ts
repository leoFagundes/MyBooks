import { describe, expect, test } from "vitest";
import imageLoader from "./image-loader";

const cover = "https://covers.openlibrary.org/b/id/647501-L.jpg";

describe("imageLoader", () => {
  test("escolhe o menor tamanho da Open Library que cobre a largura (S 38, M 180, L 333)", () => {
    expect(imageLoader({ src: cover, width: 32 })).toBe(
      "https://covers.openlibrary.org/b/id/647501-S.jpg?default=false",
    );
    expect(imageLoader({ src: cover, width: 128 })).toBe(
      "https://covers.openlibrary.org/b/id/647501-M.jpg?default=false",
    );
    expect(imageLoader({ src: cover, width: 180 })).toBe(
      "https://covers.openlibrary.org/b/id/647501-M.jpg?default=false",
    );
    expect(imageLoader({ src: cover, width: 640 })).toBe(
      "https://covers.openlibrary.org/b/id/647501-L.jpg?default=false",
    );
  });

  // Sem capa, a Open Library responde 200 com um GIF transparente de 1px, e o
  // onError nunca dispara; com default=false ela responde 404
  test("pede 404 quando não há capa, para a capa tipográfica entrar", () => {
    expect(imageLoader({ src: cover, width: 96 })).toMatch(/\?default=false$/);
  });

  test("larguras do mesmo tamanho dão a mesma URL, para aproveitar o cache", () => {
    expect(imageLoader({ src: cover, width: 640 })).toBe(
      imageLoader({ src: cover, width: 1080 }),
    );
    expect(imageLoader({ src: cover, width: 48 })).toBe(
      imageLoader({ src: cover, width: 96 }),
    );
  });

  test("funciona com capas por ISBN e OLID", () => {
    expect(
      imageLoader({
        src: "https://covers.openlibrary.org/b/isbn/9788535902778-M.jpg",
        width: 96,
      }),
    ).toBe(
      "https://covers.openlibrary.org/b/isbn/9788535902778-M.jpg?default=false",
    );
    expect(
      imageLoader({
        src: "https://covers.openlibrary.org/b/olid/OL7353617M-S.jpg",
        width: 400,
      }),
    ).toBe(
      "https://covers.openlibrary.org/b/olid/OL7353617M-L.jpg?default=false",
    );
  });

  test("capas do nosso bucket: a menor das três larguras que cobre (S 96, M 240, L 480)", () => {
    const folder =
      "https://exemplo.supabase.co/storage/v1/object/public/covers/68c7e16e-6b1e-54f7-9662-e4122baaaf7a";
    expect(imageLoader({ src: folder, width: 64 })).toBe(`${folder}/S.webp`);
    expect(imageLoader({ src: folder, width: 96 })).toBe(`${folder}/S.webp`);
    expect(imageLoader({ src: folder, width: 128 })).toBe(`${folder}/M.webp`);
    expect(imageLoader({ src: folder, width: 256 })).toBe(`${folder}/L.webp`);
    expect(imageLoader({ src: folder, width: 1080 })).toBe(`${folder}/L.webp`);
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
