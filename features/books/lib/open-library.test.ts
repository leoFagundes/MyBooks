import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import horaDaEstrela from "./__fixtures__/openlibrary-a-hora-da-estrela.json";
import domCasmurro from "./__fixtures__/openlibrary-dom-casmurro.json";
import relacao from "./__fixtures__/openlibrary-relacao-verdadeira.json";
import tortoArado from "./__fixtures__/openlibrary-torto-arado.json";
import {
  normalizeOpenLibraryDoc,
  OPEN_LIBRARY_USER_AGENT,
  searchOpenLibrary,
} from "./open-library";
import { BOOK_LIMITS, dedupeResults } from "./search-result";

type Doc = Record<string, unknown>;

// As fixtures são respostas reais da busca da Open Library (search.json)
function doc(fixture: { docs: readonly object[] }, key: string): Doc {
  const found = fixture.docs.find((d) => (d as Doc).key === key);
  if (!found) throw new Error(`${key} não está na fixture`);
  return found as Doc;
}

const plain = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

describe("normalizeOpenLibraryDoc", () => {
  test("obra com capa e ISBNs", () => {
    expect(
      normalizeOpenLibraryDoc(doc(tortoArado, "/works/OL24141556W")),
    ).toEqual({
      source: "openlibrary",
      sourceId: "OL24141556W",
      title: "Torto Arado",
      subtitle: null,
      authors: ["Itamar Vieira Júnior"],
      publishedYear: 2019,
      pageCount: 280,
      isbn13: "9786580309313",
      isbn10: "6580309318",
      language: "pt",
      genres: [
        "Magic realism (Literature)",
        "Accidents",
        "Domestic fiction",
        "Families",
        "farmers",
        "fiction",
        "novels",
        "sisters",
      ],
      coverUrl: "https://covers.openlibrary.org/b/id/12369648-L.jpg",
    });
  });

  test("sem capa: coverUrl null", () => {
    expect(
      normalizeOpenLibraryDoc(doc(domCasmurro, "/works/OL32825215W")),
    ).toMatchObject({ sourceId: "OL32825215W", coverUrl: null });
  });

  test("sem ano e sem autores: ano null e lista vazia", () => {
    expect(
      normalizeOpenLibraryDoc(doc(horaDaEstrela, "/works/OL17868321W")),
    ).toMatchObject({
      title: "A Hora da Estrela",
      publishedYear: null,
      authors: [],
      pageCount: null,
      isbn13: null,
      isbn10: null,
      language: null,
      genres: [],
    });
  });

  test("autores ausentes viram lista vazia, nunca 'undefined'", () => {
    const result = normalizeOpenLibraryDoc(
      doc(tortoArado, "/works/OL17359948W"),
    );
    expect(result?.authors).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("undefined");
  });

  test("só ISBN-10 (o documento real sem os ISBN-13): o ISBN-13 sai dele", () => {
    const real = doc(tortoArado, "/works/OL24141556W");
    const onlyTen = {
      ...real,
      isbn: (real.isbn as string[]).filter((isbn) => isbn.length === 10),
    };
    expect(normalizeOpenLibraryDoc(onlyTen)).toMatchObject({
      isbn13: "9786580309313",
      isbn10: "6580309318",
    });
  });

  test("título com mais de 300 caracteres é cortado no limite do banco", () => {
    // O título real tem 266 caracteres; esticado para passar do limite
    const real = doc(relacao, "/works/OL45775504W");
    const long = {
      ...real,
      title: `${String(real.title)}, com a relaçaõ das igrejas, conventos e casas que ficáraõ arruinadas`,
    };
    expect(long.title.length).toBeGreaterThan(300);
    const title = normalizeOpenLibraryDoc(long)?.title ?? "";
    expect([...title].length).toBeLessThanOrEqual(BOOK_LIMITS.title);
    expect(title).toMatch(/^Relaçaõ verdadeira com todas as circumstancias/);
    expect(title).toMatch(/…$/);
  });

  test("sem chave ou sem título não vira resultado", () => {
    expect(normalizeOpenLibraryDoc({ title: "Sem chave" })).toBeNull();
    expect(
      normalizeOpenLibraryDoc({ key: "/works/OL1W", title: "   " }),
    ).toBeNull();
    expect(normalizeOpenLibraryDoc(null)).toBeNull();
    expect(normalizeOpenLibraryDoc("Dom Casmurro")).toBeNull();
  });
});

describe("edições duplicadas da Open Library", () => {
  test("viram uma: a primeira, que tem capa", () => {
    const results = dedupeResults(
      domCasmurro.docs
        .map(normalizeOpenLibraryDoc)
        .filter((result) => result !== null),
    );
    const machado = results.filter(
      (result) =>
        plain(result.title) === "dom casmurro" &&
        plain(result.authors[0] ?? "").endsWith("assis"),
    );
    expect(machado).toEqual([
      expect.objectContaining({
        sourceId: "OL1003040W",
        coverUrl: "https://covers.openlibrary.org/b/id/647501-L.jpg",
      }),
    ]);
  });
});

describe("searchOpenLibrary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const respond = (body: unknown, init?: ResponseInit) =>
    vi.fn<typeof fetch>(async () => Response.json(body, init));

  test("pede com User-Agent identificado, sem contato, e normaliza", async () => {
    vi.setSystemTime(new Date("2026-10-25T10:00:00Z"));
    const fetcher = respond(domCasmurro);
    const results = await searchOpenLibrary("dom casmurro", fetcher);

    const [input, init] = fetcher.mock.calls[0];
    const url = new URL(String(input));
    expect(`${url.origin}${url.pathname}`).toBe(
      "https://openlibrary.org/search.json",
    );
    expect(url.searchParams.get("q")).toBe("dom casmurro");
    expect(url.searchParams.get("fields")).toContain("cover_i");
    expect(new Headers(init?.headers).get("User-Agent")).toBe(
      OPEN_LIBRARY_USER_AGENT,
    );
    expect(OPEN_LIBRARY_USER_AGENT).toBe("MyBooks/0.1");
    expect(results?.[0]).toMatchObject({ sourceId: "OL1003040W" });
    expect(results?.length).toBeLessThan(domCasmurro.docs.length);
  });

  test("falha da Open Library vira null, para a busca tentar o Google", async () => {
    vi.setSystemTime(new Date("2026-10-25T11:00:00Z"));
    expect(
      await searchOpenLibrary("torto", respond({}, { status: 503 })),
    ).toBeNull();
    vi.setSystemTime(new Date("2026-10-25T12:00:00Z"));
    const offline = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await searchOpenLibrary("torto", offline)).toBeNull();
  });

  test("no máximo um pedido por segundo (sem contato na identificação)", async () => {
    vi.setSystemTime(new Date("2026-10-25T13:00:00Z"));
    const fetcher = respond({ docs: [] });
    const first = searchOpenLibrary("sertao", fetcher);
    const second = searchOpenLibrary("veredas", fetcher);
    await vi.advanceTimersByTimeAsync(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    await expect(Promise.all([first, second])).resolves.toEqual([[], []]);
  });

  test("Open Library lenta vira null em 10s, para a busca não travar", async () => {
    vi.setSystemTime(new Date("2026-10-25T14:00:00Z"));
    const hanging = vi.fn<typeof fetch>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(init.signal?.reason),
          );
        }),
    );
    let settled = false;
    const search = searchOpenLibrary("sertao", hanging).finally(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(9_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(search).resolves.toBeNull();
  });
});
