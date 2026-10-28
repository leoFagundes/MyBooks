import "server-only";
import type { ImportedBook } from "@/features/shelf/schemas";
import type { createClient } from "@/lib/supabase/server";
import { searchBooks } from "../queries";
import { ensureCatalogBook } from "./catalog";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type Candidate = { title: string; authors: string[] };

const UNIQUE_VIOLATION = "23505";

const plain = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// O título que vale para comparar: sem acento, sem subtítulo e sem pontuação
function titleKey(title: string) {
  return (
    plain(title)
      .split(/[:(]/)[0]
      ?.replace(/[^a-z0-9]+/g, " ")
      .trim() ?? ""
  );
}

// O sobrenome basta: "J.R.R. Tolkien" e "J. R. R. Tolkien" são a mesma pessoa
const surname = (name: string) =>
  plain(name)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .at(-1) ?? "";

function shareAuthor(ours: string[], theirs: string[]) {
  const names = new Set(ours.map(surname).filter(Boolean));
  return theirs.some((name) => names.has(surname(name)));
}

// O ISBN do arquivo pode estar trocado: só vale se o título ou o autor baterem
const sameBook = (book: ImportedBook, found: Candidate) =>
  titleKey(found.title) === titleKey(book.title) ||
  shareAuthor(book.authors, found.authors);

async function bookWithIsbn(isbn13: string, supabase: Supabase) {
  const { data } = await supabase
    .from("books")
    .select("id, title, authors")
    .eq("isbn_13", isbn13)
    .maybeSingle();
  return data;
}

/** Os livros do catálogo com o mesmo título e um autor em comum. */
async function catalogMatches(book: ImportedBook, supabase: Supabase) {
  const wanted = titleKey(book.title);
  if (wanted.length < 2) return [];
  const { data } = await supabase.rpc("search_catalog", {
    q: wanted,
    max_results: 20,
  });
  return (data ?? []).filter(
    (found) =>
      titleKey(found.title) === wanted &&
      (book.authors.length === 0 ||
        found.authors.length === 0 ||
        shareAuthor(book.authors, found.authors)),
  );
}

async function insertManual(
  book: ImportedBook,
  isbn13: string | null,
  viewerId: string,
  supabase: Supabase,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("books")
    .insert({
      title: book.title,
      authors: book.authors,
      page_count: book.pageCount,
      published_year: book.publishedYear,
      isbn_13: isbn13,
      source: "manual",
      created_by: viewerId,
    })
    .select("id")
    .single();
  if (data) return data.id;
  if (error?.code !== UNIQUE_VIOLATION || !isbn13) return null;
  // Outro livro ficou com o ISBN no meio do caminho
  const taken = await bookWithIsbn(isbn13, supabase);
  if (taken && sameBook(book, taken)) return taken.id;
  return insertManual(book, null, viewerId, supabase);
}

/**
 * O livro de uma linha importada, no catálogo do MyBooks:
 * 1. pelo ISBN-13, se já está no catálogo;
 * 2. no catálogo, por título e autor;
 * 3. na Open Library, pelo ISBN e depois por título e autor;
 * 4. um livro manual com o mesmo título e autor (de uma importação anterior);
 * 5. senão, entra como livro manual com o que o arquivo traz.
 * Um ISBN só vale com o título ou o autor batendo, e importar de novo acha
 * os mesmos livros. A busca de fora tem cache. Null só se nem o manual entrar.
 */
export async function findOrCreateBook(
  book: ImportedBook,
  viewerId: string,
  supabase: Supabase,
): Promise<string | null> {
  const byIsbn = book.isbn13 ? await bookWithIsbn(book.isbn13, supabase) : null;
  if (byIsbn && sameBook(book, byIsbn)) return byIsbn.id;

  const known = await catalogMatches(book, supabase);
  const published = known.find((found) => found.source !== "manual");
  if (published) return published.id;

  const wanted = titleKey(book.title);
  const attempts = [
    ...(book.isbn13
      ? [
          {
            query: book.isbn13,
            accept: (found: Candidate) => sameBook(book, found),
          },
        ]
      : []),
    {
      query: `${book.title} ${book.authors[0] ?? ""}`,
      accept: (found: Candidate) => titleKey(found.title) === wanted,
    },
  ];
  for (const { query, accept } of attempts) {
    const results = (await searchBooks(query, "external"))?.filter(accept);
    // Com o mesmo título, fica o do mesmo autor
    const match =
      results?.find((found) => shareAuthor(book.authors, found.authors)) ??
      results?.[0];
    if (!match) continue;
    try {
      return await ensureCatalogBook(match, viewerId);
    } catch {
      // A capa ou o catálogo falharam: tenta o próximo caminho
    }
  }

  if (known[0]) return known[0].id;
  // O ISBN do arquivo é de outro livro do catálogo: o manual fica sem ele
  return insertManual(book, byIsbn ? null : book.isbn13, viewerId, supabase);
}
