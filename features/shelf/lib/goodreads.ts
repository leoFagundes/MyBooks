import { BOOK_LIMITS } from "@/features/books/lib/search-result";
import type { ImportedBook, ShelfStatus } from "../schemas";
import { parseCsv } from "./csv";
import { isbn13From } from "./isbn";

/** Até 2.000 livros por arquivo. */
export const MAX_IMPORT = 2000;

export type GoodreadsExport = {
  books: ImportedBook[];
  /** Linhas sem título, que ficaram de fora. */
  skipped: number;
  /** O arquivo passou do limite. */
  truncated: boolean;
};

const REQUIRED = ["Title", "Author", "Exclusive Shelf"];

// "Duna (Duna, #1)": a série entre parênteses atrapalha a busca do livro
const SERIES = /\s*\([^()]*#\s*\d+(?:[.,]\d+)?\)\s*$/;

// O Goodreads escreve o ISBN como ="0451524934", para o Excel não estragar
const unwrap = (value: string) => value.replace(/^="?|"$/g, "");

function toStatus(shelf: string): ShelfStatus {
  const name = shelf.trim().toLowerCase();
  if (name === "read") return "read";
  if (name === "currently-reading") return "reading";
  if (/dnf|did-?not-?finish|abandon/.test(name)) return "abandoned";
  return "want";
}

function toInteger(value: string, min: number, max: number) {
  const number = Number.parseInt(value, 10);
  return Number.isInteger(number) && number >= min && number <= max
    ? number
    : null;
}

function toDay(value: string) {
  const match = /^(\d{4})[/-](\d{2})[/-](\d{2})$/.exec(value.trim());
  if (!match) return null;
  const day = `${match[1]}-${match[2]}-${match[3]}`;
  return Number.isNaN(Date.parse(day)) ? null : day;
}

// A resenha do Goodreads vem em HTML simples
function toReview(html: string) {
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
  return text ? text.slice(0, 10_000) : null;
}

/**
 * A exportação do Goodreads ("Meus livros → Importar e exportar → Exportar
 * biblioteca") como livros para a estante. Lida no navegador: o arquivo
 * inteiro não sai daqui.
 */
export function readGoodreadsExport(
  text: string,
): GoodreadsExport | { error: string } {
  const [header, ...lines] = parseCsv(text);
  if (!header) return { error: "O arquivo está vazio." };
  const column = new Map(header.map((name, index) => [name.trim(), index]));
  if (!REQUIRED.every((name) => column.has(name))) {
    return {
      error:
        "Esse arquivo não parece a exportação do Goodreads. Confira se é o CSV de “Exportar biblioteca”.",
    };
  }
  const field = (line: string[], name: string) => {
    const index = column.get(name);
    return index === undefined ? "" : (line[index] ?? "").trim();
  };

  const books: ImportedBook[] = [];
  let skipped = 0;
  for (const line of lines) {
    const title = field(line, "Title")
      .replace(SERIES, "")
      .trim()
      .slice(0, BOOK_LIMITS.title);
    if (!title) {
      skipped += 1;
      continue;
    }
    const status = toStatus(field(line, "Exclusive Shelf"));
    const authors = [
      field(line, "Author"),
      ...field(line, "Additional Authors").split(","),
    ]
      .map((author) => author.trim().slice(0, BOOK_LIMITS.author))
      .filter(Boolean)
      .slice(0, BOOK_LIMITS.authors);
    const year = (name: string) =>
      toInteger(field(line, name), BOOK_LIMITS.minYear, BOOK_LIMITS.maxYear);

    books.push({
      title,
      authors,
      isbn13:
        isbn13From(unwrap(field(line, "ISBN13"))) ??
        isbn13From(unwrap(field(line, "ISBN"))),
      pageCount: toInteger(
        field(line, "Number of Pages"),
        1,
        BOOK_LIMITS.maxPages,
      ),
      publishedYear: year("Original Publication Year") ?? year("Year Published"),
      status,
      // Nota 0 é "sem nota"; Quero ler não tem nota nem datas
      rating: status === "want" ? null : toInteger(field(line, "My Rating"), 1, 5),
      finishedAt: status === "read" ? toDay(field(line, "Date Read")) : null,
      review: toReview(field(line, "My Review")),
    });
  }
  return {
    books: books.slice(0, MAX_IMPORT),
    skipped,
    truncated: books.length > MAX_IMPORT,
  };
}
