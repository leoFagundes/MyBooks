import { foldText } from "@/lib/text-match";

/** Um gênero com o nome que aparece; pendente até um admin aprovar. */
export type Genre = { slug: string; name: string; pending?: boolean };

export const GENRE_NAME_MIN = 2;
export const GENRE_NAME_MAX = 40;

/** "  ficção   CIENTÍFICA " vira "Ficção científica": espaços e só a primeira maiúscula. */
export function normalizeGenreName(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return "";
  const lower = text.toLocaleLowerCase("pt-BR");
  return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
}

/** O slug do gênero, como o banco pede: sem acento, minúsculo, com hífens. */
export function genreSlug(name: string): string {
  return foldText(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, GENRE_NAME_MAX)
    .replace(/-+$/, "");
}

// Palavras que não viram gênero. Curta de propósito: o resto, a aprovação
// do admin pega (o gênero novo só aparece para os outros depois dela)
const BLOCKED = new Set([
  "porra",
  "caralho",
  "buceta",
  "puta",
  "puto",
  "merda",
  "cu",
  "foda",
  "foder",
  "fodase",
  "viado",
  "bosta",
  "cacete",
  "piroca",
  "pica",
  "xoxota",
  "arrombado",
  "vagabunda",
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "dick",
  "pussy",
  "nigger",
  "faggot",
]);

/** Tem palavrão? Compara palavra por palavra, sem acento e sem caixa. */
export function isOffensive(name: string): boolean {
  return foldText(name)
    .split(/[^a-z0-9]+/)
    .some((word) => BLOCKED.has(word));
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0] as number;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j] as number;
      row[j] = Math.min(
        above + 1,
        (row[j - 1] as number) + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return row[b.length] as number;
}

/**
 * O gênero que já existe com o mesmo nome (sem acento nem caixa): quem
 * digita "ficcao cientifica" ganha "Ficção científica".
 */
export function sameGenre<T extends Genre>(
  name: string,
  genres: readonly T[],
): T | null {
  const slug = genreSlug(name);
  return genres.find((genre) => genre.slug === slug) ?? null;
}

/**
 * Um gênero parecido, para a sugestão "Você quis dizer…": até um erro de
 * digitação a cada 5 letras (no mínimo um).
 */
export function similarGenre<T extends Genre>(
  name: string,
  genres: readonly T[],
): T | null {
  const key = genreSlug(name).replace(/-/g, "");
  if (key.length < 3) return null;
  const limit = Math.max(1, Math.floor(key.length / 5));
  let best: { genre: T; score: number } | null = null;
  for (const genre of genres) {
    const other = genre.slug.replace(/-/g, "");
    const score = distance(key, other);
    if (score <= limit && (!best || score < best.score)) {
      best = { genre, score };
    }
  }
  return best?.genre ?? null;
}
