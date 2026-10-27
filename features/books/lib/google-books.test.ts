import { describe, expect, test, vi } from "vitest";
import volumes from "./__fixtures__/google-books-volumes.json";
import { normalizeGoogleVolume, searchGoogleBooks } from "./google-books";

// Fixture no formato documentado do recurso Volume (ver o _nota dela)
function volume(id: string) {
  const found = volumes.items.find((item) => item.id === id);
  if (!found) throw new Error(`${id} não está na fixture`);
  return found;
}

describe("normalizeGoogleVolume", () => {
  test("volume com capa e ISBNs", () => {
    expect(normalizeGoogleVolume(volume("SEM-CHAVE-01"))).toEqual({
      source: "google",
      sourceId: "SEM-CHAVE-01",
      title: "Torto arado",
      subtitle: null,
      authors: ["Itamar Vieira Junior"],
      publishedYear: 2019,
      pageCount: 280,
      isbn13: "9786580309313",
      isbn10: "6580309318",
      language: "pt",
      genres: ["Fiction"],
      // https e sem a dobra de página que o Google desenha na miniatura
      coverUrl:
        "https://books.google.com/books/content?id=SEM-CHAVE-01&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    });
  });

  test("volume sem imageLinks: coverUrl null", () => {
    expect(normalizeGoogleVolume(volume("SEM-CHAVE-02"))).toMatchObject({
      coverUrl: null,
    });
  });

  test("só ISBN-10: o ISBN-13 sai dele; pt-BR vira pt", () => {
    expect(normalizeGoogleVolume(volume("SEM-CHAVE-02"))).toMatchObject({
      isbn10: "8508007736",
      isbn13: "9788508007738",
      language: "pt",
      publishedYear: 1983,
    });
  });

  test("sem ISBN, subtítulo com espaços e categorias repetidas", () => {
    expect(normalizeGoogleVolume(volume("SEM-CHAVE-03"))).toMatchObject({
      subtitle: "romance",
      isbn13: null,
      isbn10: null,
      genres: ["Fiction / Classics"],
      publishedYear: 1899,
      pageCount: null,
    });
  });

  test("sem id ou sem título não vira resultado", () => {
    expect(normalizeGoogleVolume({ volumeInfo: { title: "X" } })).toBeNull();
    expect(normalizeGoogleVolume({ id: "a", volumeInfo: {} })).toBeNull();
    expect(normalizeGoogleVolume(undefined)).toBeNull();
  });
});

describe("searchGoogleBooks", () => {
  test("sem chave de API não pede nada: a cota anônima do Google é zero", async () => {
    const fetcher = vi.fn<typeof fetch>();
    expect(await searchGoogleBooks("dom casmurro", undefined, fetcher)).toBe(
      null,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("com chave, pede só livros e normaliza", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(volumes));
    const results = await searchGoogleBooks(
      "torto arado",
      "chave-de-teste",
      fetcher,
    );
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(`${url.origin}${url.pathname}`).toBe(
      "https://www.googleapis.com/books/v1/volumes",
    );
    expect(url.searchParams.get("q")).toBe("torto arado");
    expect(url.searchParams.get("printType")).toBe("books");
    expect(url.searchParams.get("key")).toBe("chave-de-teste");
    expect(results?.map((result) => result.sourceId)).toEqual([
      "SEM-CHAVE-01",
      "SEM-CHAVE-02",
      "SEM-CHAVE-03",
    ]);
  });

  test("cota esgotada ou rede fora viram null", async () => {
    const limited = vi.fn(async () => Response.json({}, { status: 429 }));
    expect(await searchGoogleBooks("x", "chave", limited)).toBeNull();
    const offline = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await searchGoogleBooks("x", "chave", offline)).toBeNull();
  });

  test("Google lento vira null em 10s", async () => {
    vi.useFakeTimers();
    try {
      const hanging = vi.fn<typeof fetch>(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(init.signal?.reason),
            );
          }),
      );
      let settled = false;
      const search = searchGoogleBooks("x", "chave", hanging).finally(() => {
        settled = true;
      });
      await vi.advanceTimersByTimeAsync(9_999);
      expect(settled).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await expect(search).resolves.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
