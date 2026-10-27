import { randomInt, randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { seedId } from "../../scripts/seed-ids";
import {
  asAdmin,
  asUser,
  check,
  createUser,
  rejects,
  runSql,
  sqlTransaction,
} from "./sql";
import { ensureCatalogBook } from "@/features/books/lib/catalog";
import {
  isbn10To13,
  type SearchResult,
} from "@/features/books/lib/search-result";
import { createAdminClient } from "@/lib/supabase/admin";

const LIA = "00000000-0000-4000-8000-000000000001";

describe("quem põe livro no catálogo", () => {
  test("logado só cadastra livro manual; Open Library e Google entram pelo servidor", async () => {
    const insert = (source: string, sourceId: string | null) =>
      `insert into public.books (title, source, source_id, created_by) values ('Dom Casmurro', '${source}', ${sourceId ? `'${sourceId}'` : "null"}, '${LIA}');`;
    await runSql(
      sqlTransaction(
        createUser({ id: LIA, email: "lia@x.com" }),
        asUser(LIA),
        rejects(insert("openlibrary", "OL1W"), "livro da Open Library direto"),
        rejects(insert("google", "abc123"), "livro do Google direto"),
        insert("manual", null),
        asAdmin(),
        check(
          `(select count(*) from public.books where created_by = '${LIA}') = 1`,
          "o livro manual entrou",
        ),
      ),
    );
  });
});

// Daqui para baixo o teste grava de verdade (pela API, como o app) e apaga
// tudo no fim: livros e arquivos do bucket covers
describe("ensureCatalogBook", () => {
  const viewer = seedId("user", "ana");
  const created = new Set<string>();
  let image: Buffer;

  beforeAll(async () => {
    image = await sharp({
      create: { width: 333, height: 500, channels: 3, background: "#1d6a96" },
    })
      .jpeg()
      .toBuffer();
  });

  afterAll(async () => {
    const admin = createAdminClient();
    const ids = [...created];
    await admin.storage
      .from("covers")
      .remove(
        ids.flatMap((id) => ["S", "M", "L"].map((n) => `${id}/${n}.webp`)),
      );
    await admin.from("books").delete().in("id", ids);
  });

  // A capa vem de um fetch falso: o teste não depende da Open Library
  const coverFetcher = () =>
    vi.fn<typeof fetch>(
      async () =>
        new Response(new Uint8Array(image), {
          headers: { "Content-Type": "image/jpeg" },
        }),
    );

  function newResult(overrides: Partial<SearchResult> = {}): SearchResult {
    const nine = String(randomInt(0, 1e9)).padStart(9, "0");
    return {
      source: "openlibrary",
      sourceId: `OL${randomInt(1e9, 9e9)}W`,
      title: "Livro de Teste",
      subtitle: null,
      authors: ["Autora de Teste"],
      publishedYear: 2020,
      pageCount: 123,
      isbn13: isbn10To13(`${nine}0`),
      isbn10: null,
      language: "pt",
      genres: ["Brazilian fiction", "Short stories"],
      coverUrl: "https://covers.openlibrary.org/b/id/12369648-L.jpg",
      ...overrides,
    };
  }

  async function ensure(result: SearchResult, fetcher = coverFetcher()) {
    const id = await ensureCatalogBook(result, viewer, { fetcher });
    created.add(id);
    return id;
  }

  async function book(id: string) {
    const { data, error } = await createAdminClient()
      .from("books")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data;
  }

  test("livro novo entra com cor, gêneros do MyBooks e as três larguras no bucket", async () => {
    const result = newResult();
    const id = await ensure(result);
    expect(await book(id)).toMatchObject({
      title: "Livro de Teste",
      source: "openlibrary",
      source_id: result.sourceId,
      isbn_13: result.isbn13,
      genres: ["literatura-brasileira", "contos"],
      cover_url: `covers/${id}`,
      created_by: viewer,
    });
    expect((await book(id)).cover_color).toMatch(/^#[0-9a-f]{6}$/);
    const { data: files } = await createAdminClient()
      .storage.from("covers")
      .list(id);
    expect(files?.map((file) => file.name).sort()).toEqual([
      "L.webp",
      "M.webp",
      "S.webp",
    ]);
  });

  test("a mesma obra de novo é o mesmo livro, sem baixar a capa outra vez", async () => {
    const result = newResult();
    const id = await ensure(result);
    const fetcher = coverFetcher();
    expect(await ensure(result, fetcher)).toBe(id);
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("o mesmo ISBN-13 vindo do Google é o livro que já está no catálogo", async () => {
    const result = newResult();
    const id = await ensure(result);
    const google = newResult({
      source: "google",
      sourceId: randomUUID().slice(0, 12),
      isbn13: result.isbn13,
      coverUrl: null,
    });
    expect(await ensure(google)).toBe(id);
  });

  test("dois pedidos ao mesmo tempo criam um livro só", async () => {
    const result = newResult();
    const [first, second] = await Promise.all([ensure(result), ensure(result)]);
    expect(second).toBe(first);
    const { count } = await createAdminClient()
      .from("books")
      .select("id", { count: "exact", head: true })
      .eq("source_id", result.sourceId);
    expect(count).toBe(1);
  });

  test("capa que não baixa: fica a da Open Library, sem cor", async () => {
    const result = newResult();
    const missing = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 404 }),
    );
    const id = await ensure(result, missing);
    expect(await book(id)).toMatchObject({
      cover_url: result.coverUrl,
      cover_color: null,
    });
  });

  test("capa fora da Open Library e do Google nem é pedida", async () => {
    const fetcher = coverFetcher();
    const id = await ensure(
      newResult({ coverUrl: "https://exemplo.com/capa.jpg" }),
      fetcher,
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(await book(id)).toMatchObject({
      cover_url: null,
      cover_color: null,
    });
  });
});
