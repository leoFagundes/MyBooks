import { describe, expect, test } from "vitest";
import { sampleBooks } from "@/features/books/sample-books";
import {
  SEED_BOOKS,
  SEED_COLLECTIONS,
  SEED_READERS,
} from "../../scripts/seed-data";
import { seedId } from "../../scripts/seed-ids";
import { runSql } from "./sql";

// Só leitura: confere o que o seed.sql deixou no banco
const list = (ids: string[]) => ids.map((id) => `'${id}'`).join(", ");
const books = list(SEED_BOOKS.map((book) => seedId("book", book.slug)));
const readers = list(SEED_READERS.map((r) => seedId("user", r.username)));
const collections = list(
  SEED_COLLECTIONS.map((c) => seedId("collection", c.slug)),
);

async function one(query: string) {
  const [row] = await runSql(query);
  return row as Record<string, number | string | null>;
}

describe("seed", () => {
  test("40 livros reais ou mais, todos com cor de capa válida", async () => {
    const row = await one(
      `select count(*)::int as total,
        count(*) filter (where cover_color ~ '^#[0-9a-f]{6}$')::int as colored,
        count(*) filter (where source = 'openlibrary' and source_id ~ '^OL[0-9]+W$')::int as from_open_library
      from public.books where id in (${books})`,
    );
    expect(row.total).toBeGreaterThanOrEqual(40);
    expect(row.colored).toBe(row.total);
    expect(row.from_open_library).toBe(row.total);
  });

  test("os livros das demonstrações estão no seed, com o mesmo id", async () => {
    const slugs = new Set(SEED_BOOKS.map((book) => book.slug));
    for (const sample of sampleBooks) expect(slugs).toContain(sample.id);
    const row = await one(
      `select count(*)::int as found from public.books
      where id in (${list(sampleBooks.map((b) => seedId("book", b.id)))})`,
    );
    expect(row.found).toBe(sampleBooks.length);
  });

  test("8 leitores com onboarding feito, um deles privado", async () => {
    const row = await one(
      `select count(*)::int as total,
        count(*) filter (where onboarded_at is not null)::int as onboarded,
        count(*) filter (where is_private)::int as private
      from public.profiles where id in (${readers})`,
    );
    expect(row).toEqual({ total: 8, onboarded: 8, private: 1 });
  });

  test("cada leitor tem 8 livros ou mais, com notas e resenhas", async () => {
    const row = await one(
      `select min(total)::int as fewest, sum(rated)::int as rated, sum(reviewed)::int as reviewed
      from (
        select count(*) as total,
          count(*) filter (where rating is not null) as rated,
          count(*) filter (where review is not null) as reviewed
        from public.user_books where user_id in (${readers}) group by user_id
      ) as shelves`,
    );
    expect(row.fewest).toBeGreaterThanOrEqual(8);
    expect(row.rated).toBeGreaterThan(20);
    expect(row.reviewed).toBeGreaterThanOrEqual(8);
  });

  test("citações, follows com um pedido pendente, curtidas e salvos", async () => {
    const row = await one(
      `select
        (select count(*)::int from public.quotes where user_id in (${readers})) as quotes,
        (select count(*)::int from public.follows
          where follower_id in (${readers}) and following_id in (${readers}) and status = 'accepted') as accepted,
        (select count(*)::int from public.follows
          where follower_id in (${readers}) and following_id in (${readers}) and status = 'pending') as pending,
        (select count(*)::int from public.collection_likes where collection_id in (${collections})) as likes,
        (select count(*)::int from public.collection_saves where collection_id in (${collections})) as saves`,
    );
    expect(row.quotes).toBeGreaterThanOrEqual(10);
    expect(row.accepted).toBeGreaterThanOrEqual(15);
    expect(row.pending).toBe(1);
    expect(row.likes).toBeGreaterThanOrEqual(10);
    expect(row.saves).toBeGreaterThanOrEqual(1);
  });

  test("coleções: uma colaborativa com membro, uma privada e uma cópia com crédito", async () => {
    const row = await one(
      `select
        count(*) filter (where is_collaborative and exists (
          select 1 from public.collection_members m where m.collection_id = c.id))::int as collaborative,
        count(*) filter (where visibility = 'private')::int as private,
        count(*) filter (where copied_from_id is not null and copied_from_owner_id is not null)::int as copies,
        min((select count(*) from public.collection_items i where i.collection_id = c.id)) filter (
          where visibility = 'public')::int as smallest_public
      from public.collections c where id in (${collections})`,
    );
    expect(row.collaborative).toBeGreaterThanOrEqual(1);
    expect(row.private).toBeGreaterThanOrEqual(1);
    expect(row.copies).toBeGreaterThanOrEqual(1);
    expect(row.smallest_public).toBeGreaterThanOrEqual(3);
  });

  test("o feed nasce com atividades espalhadas no tempo", async () => {
    const row = await one(
      `select count(*)::int as total,
        count(distinct date_trunc('day', created_at))::int as days
      from public.activities where actor_id in (${readers})`,
    );
    expect(row.total).toBeGreaterThan(50);
    expect(row.days).toBeGreaterThan(20);
  });
});
