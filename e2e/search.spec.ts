import { expect, test } from "@playwright/test";
import { seedId } from "../scripts/seed-ids";

type Result = { title: string; catalogId?: string; source: string };

test.describe("busca de livros", () => {
  test("o livro do catálogo vem primeiro, sem acento", async ({ request }) => {
    const response = await request.get("/api/books/search?q=sertao");
    expect(response.ok()).toBe(true);
    const { results } = (await response.json()) as { results: Result[] };
    expect(results[0]).toMatchObject({
      title: "Grande Sertão: Veredas",
      catalogId: seedId("book", "grande-sertao-veredas"),
    });
  });

  // A paleta mostra o catálogo na hora e completa com a Open Library depois
  test("só o catálogo, quando pedido", async ({ request }) => {
    const response = await request.get(
      "/api/books/search?q=sertao&scope=catalog",
    );
    const { results } = (await response.json()) as { results: Result[] };
    expect(results.length).toBeGreaterThan(0);
    expect(results.filter((result) => !result.catalogId)).toEqual([]);
  });

  test("uma letra só não busca", async ({ request }) => {
    const response = await request.get("/api/books/search?q=s");
    expect(await response.json()).toEqual({ results: [] });
  });
});
