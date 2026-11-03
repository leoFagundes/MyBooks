import type { GenreSlug } from "@/features/profile/genres";

/** O assunto da Open Library de cada gênero do MyBooks (subjects/<assunto>.json). */
export const GENRE_SUBJECTS: Record<GenreSlug, string> = {
  "literatura-brasileira": "brazilian_literature",
  classicos: "classic_literature",
  ficcao: "fiction",
  romance: "romance",
  contos: "short_stories",
  poesia: "poetry",
  fantasia: "fantasy",
  "ficcao-cientifica": "science_fiction",
  distopia: "dystopias",
  terror: "horror",
  misterio: "mystery",
  "realismo-magico": "magic_realism",
  historia: "history",
  biografia: "biography",
  ciencia: "science",
  filosofia: "philosophy",
  quadrinhos: "graphic_novels",
  infantojuvenil: "juvenile_fiction",
};

/** Sem filtro, os assuntos que entram na mistura com os populares. */
export const MIXED_GENRES: readonly GenreSlug[] = [
  "literatura-brasileira",
  "fantasia",
  "ficcao-cientifica",
  "misterio",
];

export const DISCOVERY_PAGE = 24;

/** Aleatório repetível (mulberry32): a mesma semente, a mesma ordem. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

/** Embaralha uma cópia com a semente (Fisher-Yates). */
export function shuffleWithSeed<T>(items: readonly T[], seed: number): T[] {
  const random = seeded(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

/**
 * Uma página da grade, sempre da mesma ordem embaralhada: as páginas não se
 * repetem, e quem volta com a mesma semente vê a mesma lista.
 */
export function discoveryPage<T>(
  pool: readonly T[],
  seed: number,
  page: number,
  size = DISCOVERY_PAGE,
): { items: T[]; next: number | null } {
  const start = page * size;
  const items = shuffleWithSeed(pool, seed).slice(start, start + size);
  return { items, next: start + size < pool.length ? page + 1 : null };
}
