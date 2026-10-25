// Gera supabase/seed.sql a partir de scripts/seed-data.ts (ESM, por causa do
// await no topo). Busca cada obra
// uma única vez na Open Library (1 pedido por segundo, User-Agent sem
// e-mail), extrai a cor da capa com o node-vibrant e guarda as respostas num
// cache temporário, para rodar de novo sem refazer os pedidos.
//
// Uso: npm run seed:gerar

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Vibrant } from "node-vibrant/node";
import { generatedCoverColor } from "../features/books/lib/color";
import {
  SEED_BOOKS,
  SEED_COLLECTIONS,
  SEED_FOLLOWS,
  SEED_QUOTES,
  SEED_READERS,
  type SeedBook,
} from "./seed-data";
import { seedId } from "./seed-ids";

const USER_AGENT = "MyBooks/0.1 (seed de desenvolvimento)";
const CACHE_DIR = path.join(tmpdir(), "mybooks-seed-cache");
const OUTPUT = path.join(import.meta.dirname, "..", "supabase", "seed.sql");

type OpenLibraryDoc = {
  key: string;
  title: string;
  author_name?: string[];
  number_of_pages_median?: number;
  isbn?: string[];
  cover_i?: number;
  language?: string[];
};

let lastRequest = 0;

async function fetchCached(url: string): Promise<Buffer | null> {
  const file = path.join(
    CACHE_DIR,
    createHash("sha1").update(url).digest("hex"),
  );
  try {
    return await readFile(file);
  } catch {
    // Sem cache: busca
  }
  const wait = lastRequest + 1000 - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequest = Date.now();
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${response.status} em ${url}`);
  const body = Buffer.from(await response.arrayBuffer());
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(file, body);
  return body;
}

// A obra com mais edições é a principal; as outras costumam ser reedições
// soltas, sem capa nem ISBN brasileiro
async function findWork(book: SeedBook): Promise<OpenLibraryDoc> {
  const params = new URLSearchParams(
    book.work
      ? { q: `key:/works/${book.work}` }
      : {
          title: book.search.title,
          author: book.search.author,
          sort: "editions",
        },
  );
  params.set(
    "fields",
    "key,title,author_name,number_of_pages_median,isbn,cover_i,language",
  );
  params.set("limit", "5");
  const body = await fetchCached(
    `https://openlibrary.org/search.json?${params}`,
  );
  const docs = body
    ? (JSON.parse(body.toString("utf8")) as { docs: OpenLibraryDoc[] }).docs
    : [];
  const doc = docs.find((candidate) =>
    book.work
      ? candidate.key === `/works/${book.work}`
      : /^\/works\/OL\d+W$/.test(candidate.key),
  );
  if (!doc) {
    throw new Error(`Obra não encontrada na Open Library: ${book.slug}`);
  }
  return doc;
}

function validIsbn13(isbn: string) {
  if (!/^97[89]\d{10}$/.test(isbn)) return false;
  const sum = [...isbn.slice(0, 12)].reduce(
    (total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1),
    0,
  );
  return (10 - (sum % 10)) % 10 === Number(isbn[12]);
}

// Edição brasileira primeiro; o ISBN é único no catálogo
function pickIsbn13(isbns: string[] = [], used: Set<string>) {
  const valid = isbns.filter((isbn) => validIsbn13(isbn) && !used.has(isbn));
  return valid.find((isbn) => /^97(885|865)/.test(isbn)) ?? valid[0] ?? null;
}

const LANGUAGES: Record<string, string> = {
  por: "pt",
  eng: "en",
  spa: "es",
  fre: "fr",
  ger: "de",
  ita: "it",
  rus: "ru",
  dut: "nl",
};

function pickLanguage(codes: string[] = []) {
  if (codes.includes("por")) return "pt";
  const known = codes.map((code) => LANGUAGES[code]).find(Boolean);
  return known ?? null;
}

async function coverColor(coverId: number | null, title: string) {
  if (coverId !== null) {
    const image = await fetchCached(
      `https://covers.openlibrary.org/b/id/${coverId}-M.jpg?default=false`,
    );
    if (image) {
      const palette = await Vibrant.from(image).getPalette();
      const swatch = palette.Vibrant ?? palette.Muted ?? palette.DarkVibrant;
      if (swatch) return { color: swatch.hex.toLowerCase(), hasCover: true };
    }
  }
  return { color: generatedCoverColor(title), hasCover: false };
}

const lit = (value: string | number | null | undefined) =>
  value === null || value === undefined
    ? "null"
    : typeof value === "number"
      ? String(value)
      : `'${value.replaceAll("'", "''")}'`;
const textArray = (items: readonly string[]) =>
  items.length > 0 ? `array[${items.map(lit).join(", ")}]` : "'{}'::text[]";
const ago = (days: number) => `now() - interval '${days} days'`;
const dateAgo = (days: number) => `current_date - ${days}`;
const ids = (values: string[]) => values.map(lit).join(", ");

const BASE_62 =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
// As mesmas chaves que firstPositions (fractional-indexing) gera para até 62
const position = (index: number) => `a${BASE_62[index]}`;

const userId = (username: string) => seedId("user", username);
const bookId = (slug: string) => seedId("book", slug);
const collectionId = (slug: string) => seedId("collection", slug);

function bookExists(slug: string) {
  if (!SEED_BOOKS.some((book) => book.slug === slug)) {
    throw new Error(`Livro fora do seed: ${slug}`);
  }
  return bookId(slug);
}

async function catalog() {
  const used = new Set<string>();
  const rows: string[] = [];
  for (const book of SEED_BOOKS) {
    const work = await findWork(book);
    const coverId =
      book.cover === undefined ? (work.cover_i ?? null) : book.cover;
    const { color, hasCover } = await coverColor(coverId, book.title);
    const isbn13 = pickIsbn13(work.isbn, used);
    if (isbn13) used.add(isbn13);
    const pages = book.pageCount ?? work.number_of_pages_median ?? null;
    const sourceId = work.key.replace("/works/", "");
    const coverUrl = hasCover
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : null;
    console.log(
      `${book.slug.padEnd(36)} ${sourceId.padEnd(12)} capa ${String(hasCover ? coverId : "—").padEnd(9)} ${String(pages ?? "?").padStart(4)} p. ${isbn13 ?? "sem ISBN"} ${color}`,
    );
    rows.push(
      `(${[
        lit(bookId(book.slug)),
        lit(book.title),
        lit(book.subtitle),
        textArray(book.authors),
        lit(book.description),
        lit(pages),
        lit(book.publishedYear),
        lit(isbn13),
        lit(pickLanguage(work.language)),
        textArray(book.genres),
        lit(coverUrl),
        lit(color),
        "'openlibrary'",
        lit(sourceId),
      ].join(", ")})`,
    );
  }
  return `insert into public.books (
  id, title, subtitle, authors, description, page_count, published_year, isbn_13,
  language, genres, cover_url, cover_color, source, source_id
) values
${rows.join(",\n")}
on conflict do nothing;`;
}

function readers() {
  return SEED_READERS.map((reader) => {
    const id = userId(reader.username);
    const email = `${reader.username}@example.com`;
    const meta = JSON.stringify({
      username: reader.username,
      full_name: reader.displayName,
    });
    const identity = JSON.stringify({
      sub: id,
      email,
      email_verified: true,
    });
    return `insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000', ${lit(id)}, 'authenticated', 'authenticated',
  ${lit(email)}, '', ${ago(reader.joinedDaysAgo)},
  '{"provider":"email","providers":["email"]}', ${lit(meta)},
  ${ago(reader.joinedDaysAgo)}, now(), '', '', '', ''
) on conflict (id) do nothing;
insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
values (${lit(id)}, ${lit(id)}, ${lit(identity)}, 'email', ${ago(reader.joinedDaysAgo)}, now())
on conflict (provider_id, provider) do nothing;
update public.profiles set
  display_name = ${lit(reader.displayName)},
  bio = ${lit(reader.bio)},
  favorite_genres = ${textArray(reader.genres)},
  is_private = ${reader.isPrivate ? "true" : "false"},
  onboarded_at = coalesce(onboarded_at, ${ago(reader.joinedDaysAgo)}),
  created_at = ${ago(reader.joinedDaysAgo)}
where id = ${lit(id)};`;
  }).join("\n\n");
}

// Leitura de 1 a 4 semanas, conforme o livro, para as datas não se repetirem
const readingDays = (slug: string) =>
  7 + ((createHash("sha1").update(slug).digest()[0] ?? 0) % 22);

function shelves() {
  const rows = SEED_READERS.flatMap((reader) =>
    reader.shelf.map((entry) => {
      const started =
        entry.status === "read" || entry.status === "abandoned"
          ? dateAgo(entry.daysAgo + readingDays(entry.book))
          : entry.status === "reading"
            ? dateAgo(entry.daysAgo)
            : "null";
      const finished =
        entry.status === "read" ? dateAgo(entry.daysAgo) : "null";
      return `(${[
        lit(userId(reader.username)),
        lit(bookExists(entry.book)),
        lit(entry.status),
        lit(entry.rating),
        lit(entry.review),
        started,
        finished,
        lit(entry.currentPage),
        entry.copiedFrom ? lit(userId(entry.copiedFrom)) : "null",
        ago(entry.daysAgo),
        ago(entry.daysAgo),
      ].join(", ")})`;
    }),
  );
  return `insert into public.user_books (
  user_id, book_id, status, rating, review, started_at, finished_at, current_page,
  copied_from_user_id, created_at, updated_at
) values
${rows.join(",\n")}
on conflict (user_id, book_id) do nothing;`;
}

function quotes() {
  const rows = SEED_QUOTES.map(
    (quote, i) =>
      `(${[
        lit(seedId("quote", `${quote.reader}:${quote.book}:${i}`)),
        lit(userId(quote.reader)),
        lit(bookExists(quote.book)),
        lit(quote.text),
        ago(quote.daysAgo),
      ].join(", ")})`,
  );
  return `insert into public.quotes (id, user_id, book_id, text, created_at) values
${rows.join(",\n")}
on conflict (id) do nothing;`;
}

function follows() {
  const rows = SEED_FOLLOWS.map(
    (follow) =>
      `(${lit(userId(follow.from))}, ${lit(userId(follow.to))}, ${ago(follow.daysAgo)})`,
  );
  // O trigger põe "pending" em quem segue perfil privado; aqui o perfil aceita
  const accepted = SEED_FOLLOWS.filter((follow) => !follow.pending).map(
    (follow) =>
      `update public.follows set status = 'accepted'
where follower_id = ${lit(userId(follow.from))} and following_id = ${lit(userId(follow.to))} and status = 'pending';`,
  );
  return `insert into public.follows (follower_id, following_id, created_at) values
${rows.join(",\n")}
on conflict do nothing;

${accepted.join("\n")}`;
}

function collections() {
  // Origens antes das cópias: o trigger lê a dona da origem
  const ordered = [...SEED_COLLECTIONS].sort(
    (a, b) => Number(Boolean(a.copiedFrom)) - Number(Boolean(b.copiedFrom)),
  );
  const statements = ordered.map((collection) => {
    const id = collectionId(collection.slug);
    const items = collection.books.map(
      (book, i) =>
        `(${[
          lit(id),
          lit(bookExists(book.slug)),
          lit(position(i)),
          lit(book.note),
          lit(userId(book.addedBy ?? collection.owner)),
          ago(Math.max(1, collection.daysAgo - i)),
        ].join(", ")})`,
    );
    const members = (collection.members ?? []).map(
      (member) =>
        `(${lit(id)}, ${lit(userId(member))}, ${ago(collection.daysAgo)})`,
    );
    const likes = (collection.likes ?? []).map(
      (liker, i) =>
        `(${lit(userId(liker))}, ${lit(id)}, ${ago(Math.max(1, collection.daysAgo - 3 * (i + 1)))})`,
    );
    const saves = (collection.saves ?? []).map(
      (saver, i) =>
        `(${lit(userId(saver))}, ${lit(id)}, ${ago(Math.max(1, collection.daysAgo - 4 * (i + 1)))})`,
    );
    return [
      `insert into public.collections (
  id, owner_id, title, description, emoji, visibility, is_collaborative, copied_from_id,
  created_at, updated_at
) values (
  ${lit(id)}, ${lit(userId(collection.owner))}, ${lit(collection.title)}, ${lit(collection.description)},
  ${lit(collection.emoji)}, ${lit(collection.visibility)}, ${collection.collaborative ? "true" : "false"},
  ${collection.copiedFrom ? lit(collectionId(collection.copiedFrom)) : "null"},
  ${ago(collection.daysAgo)}, ${ago(collection.daysAgo)}
) on conflict (id) do nothing;`,
      members.length > 0 &&
        `insert into public.collection_members (collection_id, user_id, created_at) values
${members.join(",\n")}
on conflict do nothing;`,
      items.length > 0 &&
        `insert into public.collection_items (collection_id, book_id, position, note, added_by, added_at) values
${items.join(",\n")}
on conflict do nothing;`,
      likes.length > 0 &&
        `insert into public.collection_likes (user_id, collection_id, created_at) values
${likes.join(",\n")}
on conflict do nothing;`,
      saves.length > 0 &&
        `insert into public.collection_saves (user_id, collection_id, created_at) values
${saves.join(",\n")}
on conflict do nothing;`,
    ]
      .filter(Boolean)
      .join("\n");
  });
  return statements.join("\n\n");
}

// Os triggers criam atividades e avisos com a hora da inserção; o feed do
// seed fica com a hora de cada coisa
function timestamps() {
  const people = ids(SEED_READERS.map((reader) => userId(reader.username)));
  const seededCollections = ids(
    SEED_COLLECTIONS.map((collection) => collectionId(collection.slug)),
  );
  return `update public.activities as a set created_at = ub.created_at
from public.user_books as ub
where a.actor_id = ub.user_id and a.book_id = ub.book_id
  and a.type = 'shelf_' || ub.status and ub.user_id in (${people});

update public.activities as a set created_at = c.created_at
from public.collections as c
where a.type = 'collection_create' and a.collection_id = c.id and c.id in (${seededCollections});

update public.activities as a set created_at = i.added_at
from public.collection_items as i
where a.type = 'collection_add' and a.collection_id = i.collection_id and a.book_id = i.book_id
  and i.collection_id in (${seededCollections});

update public.activities as a set created_at = f.created_at
from public.follows as f
where a.type = 'follow' and a.actor_id = f.follower_id and a.target_user_id = f.following_id
  and f.follower_id in (${people});

update public.notifications as n set created_at = f.created_at
from public.follows as f
where n.type in ('follow', 'follow_request') and n.actor_id = f.follower_id
  and n.user_id = f.following_id and f.follower_id in (${people});

update public.notifications as n set created_at = l.created_at
from public.collection_likes as l
where n.type = 'collection_like' and n.actor_id = l.user_id
  and n.refs ->> 'collection_id' = l.collection_id::text and l.collection_id in (${seededCollections});

update public.notifications as n set created_at = c.created_at
from public.collections as c
where n.type = 'collection_copy' and n.refs ->> 'copy_id' = c.id::text and c.id in (${seededCollections});

update public.notifications as n set created_at = m.created_at
from public.collection_members as m
where n.type = 'collection_invite' and n.user_id = m.user_id
  and n.refs ->> 'collection_id' = m.collection_id::text and m.collection_id in (${seededCollections});`;
}

const books = await catalog();
const sql = [
  "-- Gerado por scripts/gerar-seed.mts a partir de scripts/seed-data.ts. Não edite à mão:",
  "-- mude o seed-data.ts e rode npm run seed:gerar. Leitores de exemplo não têm senha.",
  "",
  "-- Leitores",
  readers(),
  "",
  "-- Catálogo (dados da Open Library: obra, capa, páginas e ISBN)",
  books,
  "",
  "-- Estantes",
  shelves(),
  "",
  "-- Citações",
  quotes(),
  "",
  "-- Quem segue quem",
  follows(),
  "",
  "-- Coleções",
  collections(),
  "",
  "-- Datas do feed e dos avisos",
  timestamps(),
  "",
].join("\n");

await writeFile(OUTPUT, sql);
console.log(
  `\n${path.relative(process.cwd(), OUTPUT)}: ${SEED_BOOKS.length} livros, ${SEED_READERS.length} leitores`,
);
