import type { CoverStyle } from "./cover-style";

/**
 * Livro achado na busca, no mesmo formato para todas as fontes (Open Library,
 * Google Books e o nosso catálogo) e já limpo para caber nas colunas de books.
 */
export type SearchResult = {
  /** "manual" só vem do catálogo, e aí sourceId é o id do catálogo. */
  source: "openlibrary" | "google" | "manual";
  sourceId: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  publishedYear: number | null;
  pageCount: number | null;
  isbn13: string | null;
  isbn10: string | null;
  /** ISO 639-1 (pt, en…). */
  language: string | null;
  /** Assuntos da fonte, limpos; viram gêneros do MyBooks ao entrar no catálogo. */
  genres: string[];
  coverUrl: string | null;
  /** Presente quando o livro já está no catálogo. */
  catalogId?: string;
  /** Cor da capa, quando o livro já está no catálogo. */
  coverColor?: string | null;
  /** Estilo da capa tipográfica, quando o livro já está no catálogo. */
  coverStyle?: CoverStyle;
};

/** Limites das colunas de books: a migration do catálogo usa os mesmos. */
export const BOOK_LIMITS = {
  title: 300,
  subtitle: 300,
  authors: 10,
  author: 200,
  genres: 8,
  genre: 60,
  maxPages: 20_000,
  minYear: 1,
  maxYear: 2100,
} as const;

/**
 * Quanto a busca espera por uma fonte de fora. A Open Library às vezes leva
 * 20s ou nem responde; depois disso ela conta como falha e a busca segue.
 */
export const SOURCE_TIMEOUT_MS = 10_000;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const squish = (text: string) => text.replace(/\s+/g, " ").trim();

/** Sem acento, minúsculo e só letras e números, para comparar grafias. */
export function plain(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const accents = (text: string) =>
  text.normalize("NFD").match(/\p{M}/gu)?.length ?? 0;

/**
 * Texto de uma só linha, sem espaços sobrando. Passou do limite: corta numa
 * palavra perto do fim e marca o corte com reticências. Conta caracteres, como
 * o char_length do Postgres.
 */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = squish(value);
  if (!text) return null;
  const chars = [...text];
  if (chars.length <= max) return text;
  const head = chars.slice(0, max - 1).join("");
  const space = head.lastIndexOf(" ");
  const cut = space >= head.length * 0.8 ? head.slice(0, space) : head;
  return `${cut.trimEnd()}…`;
}

/**
 * Lista de textos sem vazios nem repetidos, até `maxItems`. Itens maiores que
 * `maxLength` ficam de fora (cortados não serviriam). Entre grafias da mesma
 * palavra fica a que tem acento: "Júnior", e não "Junior".
 */
export function cleanList(
  values: unknown,
  maxItems: number,
  maxLength: number,
): string[] {
  if (!Array.isArray(values)) return [];
  const byKey = new Map<string, string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const text = squish(value);
    if (!text || [...text].length > maxLength) continue;
    const key = plain(text);
    const kept = byKey.get(key);
    if (kept === undefined) {
      if (byKey.size < maxItems) byKey.set(key, text);
    } else if (accents(text) > accents(kept)) {
      byKey.set(key, text);
    }
  }
  return [...byKey.values()];
}

export function toYear(value: unknown): number | null {
  const year =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(/\d{4}/.exec(value)?.[0])
        : Number.NaN;
  return Number.isInteger(year) &&
    year >= BOOK_LIMITS.minYear &&
    year <= BOOK_LIMITS.maxYear
    ? year
    : null;
}

export function toPageCount(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= BOOK_LIMITS.maxPages
    ? value
    : null;
}

function isbn13CheckDigit(first12: string) {
  const sum = [...first12].reduce(
    (total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1),
    0,
  );
  return String((10 - (sum % 10)) % 10);
}

const isValidIsbn13 = (isbn: string) =>
  /^97[89]\d{10}$/.test(isbn) &&
  isbn13CheckDigit(isbn.slice(0, 12)) === isbn[12];

function isValidIsbn10(isbn: string) {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  const sum = [...isbn].reduce(
    (total, char, i) => total + (10 - i) * (char === "X" ? 10 : Number(char)),
    0,
  );
  return sum % 11 === 0;
}

/** O ISBN-13 da mesma edição: 978, os nove primeiros dígitos e um novo verificador. */
export function isbn10To13(isbn10: string) {
  const first12 = `978${isbn10.slice(0, 9)}`;
  return first12 + isbn13CheckDigit(first12);
}

// Edições brasileiras (978-85 e 978-65) primeiro: quem usa o MyBooks lê aqui
const isBrazilian = (isbn13: string) => /^97(?:885|865)/.test(isbn13);

/**
 * Escolhe um ISBN-13 e o ISBN-10 da mesma edição entre os da fonte (hífens e
 * espaços aceitos, dígito verificador conferido). Um ISBN-10 sozinho vale pelo
 * seu ISBN-13, que é o que deduplica o catálogo.
 */
export function pickIsbns(candidates: readonly unknown[]): {
  isbn13: string | null;
  isbn10: string | null;
} {
  const tens: string[] = [];
  const thirteens: string[] = [];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const isbn = candidate.replace(/[\s-]/g, "").toUpperCase();
    if (isValidIsbn13(isbn)) thirteens.push(isbn);
    else if (isValidIsbn10(isbn)) tens.push(isbn);
  }
  const pool = [...new Set([...thirteens, ...tens.map(isbn10To13)])];
  const isbn13 = pool.find(isBrazilian) ?? pool[0] ?? null;
  const isbn10 = tens.find((ten) => isbn10To13(ten) === isbn13) ?? null;
  return { isbn13, isbn10 };
}

// Códigos MARC (Open Library) para ISO 639-1; o Google já usa ISO 639-1
const MARC_TO_ISO: Record<string, string> = {
  por: "pt",
  eng: "en",
  spa: "es",
  fre: "fr",
  fra: "fr",
  ger: "de",
  deu: "de",
  ita: "it",
  jpn: "ja",
  rus: "ru",
  chi: "zh",
  zho: "zh",
  ara: "ar",
  kor: "ko",
  dut: "nl",
  nld: "nl",
  pol: "pl",
  swe: "sv",
  dan: "da",
  nor: "no",
  fin: "fi",
  cat: "ca",
  glg: "gl",
  lat: "la",
  gre: "el",
  ell: "el",
  heb: "he",
  tur: "tr",
  cze: "cs",
  ces: "cs",
  hun: "hu",
  rum: "ro",
  ron: "ro",
};

/**
 * Idioma em ISO 639-1. A Open Library lista os idiomas de todas as edições:
 * havendo uma em português, o livro conta como disponível aqui.
 */
export function toLanguage(codes: readonly unknown[]): string | null {
  const iso = codes.flatMap((code) => {
    if (typeof code !== "string") return [];
    const primary = code.trim().toLowerCase().split(/[-_]/)[0] ?? "";
    if (/^[a-z]{2}$/.test(primary)) return [primary];
    const mapped = MARC_TO_ISO[primary];
    return mapped ? [mapped] : [];
  });
  return iso.includes("pt") ? "pt" : (iso[0] ?? null);
}

// Quem fica quando dois resultados são a mesma obra
const rank = (result: SearchResult) =>
  (result.catalogId ? 2 : 0) + (result.coverUrl ? 1 : 0);

function identityKeys(result: SearchResult) {
  const keys = [`${result.source}:${result.sourceId}`];
  if (result.isbn13) keys.push(`isbn:${result.isbn13}`);
  // Sem autor, dois títulos iguais podem ser livros diferentes
  const surname = plain(result.authors[0] ?? "")
    .split(" ")
    .at(-1);
  if (surname) keys.push(`obra:${plain(result.title)}|${surname}`);
  return keys;
}

/**
 * Junta resultados da mesma obra: mesma fonte e id, mesmo ISBN-13, ou mesmo
 * título com o mesmo sobrenome do primeiro autor ("Machado de Assis" e
 * "Machado Assis"). Fica a posição do primeiro; vence o livro que já está no
 * catálogo e, depois, o que tem capa.
 */
export function dedupeResults(
  results: readonly SearchResult[],
): SearchResult[] {
  const kept: SearchResult[] = [];
  const slotByKey = new Map<string, number>();
  for (const result of results) {
    const keys = identityKeys(result);
    const slot = keys
      .map((key) => slotByKey.get(key))
      .find((index) => index !== undefined);
    if (slot === undefined) {
      for (const key of keys) slotByKey.set(key, kept.length);
      kept.push(result);
      continue;
    }
    for (const key of keys) if (!slotByKey.has(key)) slotByKey.set(key, slot);
    const current = kept[slot];
    if (current && rank(result) > rank(current)) kept[slot] = result;
  }
  return kept;
}
