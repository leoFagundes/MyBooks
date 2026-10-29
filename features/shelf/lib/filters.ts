import { plain } from "@/features/books/lib/search-result";
import { genreLabel } from "@/features/profile/genres";
import type { ShelfStatus } from "../schemas";

/** O mínimo que filtro e ordenação leem de cada livro da estante. */
export type ShelfEntry = {
  book: {
    id: string;
    title: string;
    authors: string[];
    publishedYear: number | null;
  };
  status: ShelfStatus;
  rating: number | null;
  genres: string[];
  updatedAt: string;
};

export const SHELF_SORTS = [
  "recentes",
  "titulo",
  "autor",
  "nota",
  "ano",
] as const;
export type ShelfSort = (typeof SHELF_SORTS)[number];

export const SORT_LABEL: Record<ShelfSort, string> = {
  recentes: "Recentes",
  titulo: "Título",
  autor: "Autoria",
  nota: "Nota",
  ano: "Ano",
};

/** "5": só 5 estrelas; "4" e "3": daquela nota para cima; "sem": sem nota. */
export const RATING_FILTERS = ["5", "4", "3", "sem"] as const;
export type RatingFilter = (typeof RATING_FILTERS)[number];

export const RATING_LABEL: Record<RatingFilter, string> = {
  "5": "5 estrelas",
  "4": "4 ou mais",
  "3": "3 ou mais",
  sem: "Sem nota",
};

export type ShelfFilters = {
  /** null: todos os status. */
  status: ShelfStatus | null;
  q: string;
  genre: string | null;
  rating: RatingFilter | null;
  /** Início da década: 1990 vale de 1990 a 1999. */
  decade: number | null;
  /** Só os livros que quem vê também tem (perfil de outra pessoa). */
  common: boolean;
  sort: ShelfSort;
};

export const DEFAULT_FILTERS: ShelfFilters = {
  status: null,
  q: "",
  genre: null,
  rating: null,
  decade: null,
  common: false,
  sort: "recentes",
};

// A URL fala português: ?status=quero-ler&genero=classicos&ordem=titulo
const STATUS_PARAM: Record<ShelfStatus, string> = {
  read: "lido",
  reading: "lendo",
  want: "quero-ler",
  abandoned: "abandonado",
};

const statusFromParam = (value: string | null): ShelfStatus | null =>
  (Object.entries(STATUS_PARAM).find(([, param]) => param === value)?.[0] as
    ShelfStatus | undefined) ?? null;

const oneOf = <T extends string>(list: readonly T[], value: string | null) =>
  list.find((item) => item === value) ?? null;

/** Lê os filtros da URL; o que não for válido vale o padrão. */
export function filtersFromParams(params: URLSearchParams): ShelfFilters {
  const decade = Number(params.get("ano"));
  const genre = params.get("genero");
  return {
    status: statusFromParam(params.get("status")),
    q: (params.get("q") ?? "").slice(0, 100),
    genre: genre && genreLabel(genre) ? genre : null,
    rating: oneOf(RATING_FILTERS, params.get("nota")),
    decade:
      Number.isInteger(decade) && decade % 10 === 0 && decade > 0
        ? decade
        : null,
    common: params.get("comum") === "1",
    sort: oneOf(SHELF_SORTS, params.get("ordem")) ?? DEFAULT_FILTERS.sort,
  };
}

/** Os filtros na URL, sem o que está no padrão (a URL limpa fica limpa). */
export function filtersToParams(filters: ShelfFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", STATUS_PARAM[filters.status]);
  if (filters.q.trim()) params.set("q", filters.q);
  if (filters.genre) params.set("genero", filters.genre);
  if (filters.rating) params.set("nota", filters.rating);
  if (filters.decade) params.set("ano", String(filters.decade));
  if (filters.common) params.set("comum", "1");
  if (filters.sort !== DEFAULT_FILTERS.sort) params.set("ordem", filters.sort);
  return params;
}

/** Busca, gênero, nota, década ou "em comum" ligados (o status tem controle próprio). */
export function hasRefinements(filters: ShelfFilters) {
  return Boolean(
    filters.q.trim() ||
    filters.genre ||
    filters.rating ||
    filters.decade ||
    filters.common,
  );
}

const decadeOf = (year: number | null) =>
  year === null ? null : Math.floor(year / 10) * 10;

function matchesRating(rating: number | null, filter: RatingFilter) {
  if (filter === "sem") return rating === null;
  return rating !== null && rating >= Number(filter);
}

/**
 * Busca sem acento por título e autoria (cada palavra precisa aparecer),
 * gênero, faixa de nota, década e os livros em comum com quem vê (`ownedIds`;
 * sem eles, o filtro "em comum" não vale). `ignoreStatus` serve às contagens
 * do controle de status, que mostram quantos há em cada um com o resto
 * aplicado.
 */
export function filterShelf<T extends ShelfEntry>(
  entries: readonly T[],
  filters: ShelfFilters,
  {
    ignoreStatus = false,
    ownedIds,
  }: { ignoreStatus?: boolean; ownedIds?: ReadonlySet<string> } = {},
): T[] {
  const words = plain(filters.q).split(" ").filter(Boolean);
  return entries.filter((entry) => {
    if (!ignoreStatus && filters.status && entry.status !== filters.status)
      return false;
    if (filters.common && ownedIds && !ownedIds.has(entry.book.id))
      return false;
    if (filters.genre && !entry.genres.includes(filters.genre)) return false;
    if (filters.rating && !matchesRating(entry.rating, filters.rating))
      return false;
    if (filters.decade && decadeOf(entry.book.publishedYear) !== filters.decade)
      return false;
    if (words.length > 0) {
      const haystack = plain(
        `${entry.book.title} ${entry.book.authors.join(" ")}`,
      );
      if (!words.every((word) => haystack.includes(word))) return false;
    }
    return true;
  });
}

const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });
const byTitle = (a: ShelfEntry, b: ShelfEntry) =>
  collator.compare(a.book.title, b.book.title);

/** Sem valor vai para o fim, nos dois sentidos. */
function nullsLast(a: number | null, b: number | null, direction: 1 | -1) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * direction;
}

/** Recentes (o último mexido primeiro), título, autoria, nota (maior primeiro) ou ano. */
export function sortShelf<T extends ShelfEntry>(
  entries: readonly T[],
  sort: ShelfSort,
): T[] {
  const sorted = [...entries];
  switch (sort) {
    case "recentes":
      return sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    case "titulo":
      return sorted.sort(byTitle);
    case "autor":
      return sorted.sort(
        (a, b) =>
          collator.compare(a.book.authors[0] ?? "", b.book.authors[0] ?? "") ||
          byTitle(a, b),
      );
    case "nota":
      return sorted.sort(
        (a, b) => nullsLast(a.rating, b.rating, -1) || byTitle(a, b),
      );
    case "ano":
      return sorted.sort(
        (a, b) =>
          nullsLast(a.book.publishedYear, b.book.publishedYear, 1) ||
          byTitle(a, b),
      );
  }
}

/** Quantos livros em cada status, e no total. */
export function countByStatus(entries: readonly ShelfEntry[]) {
  const counts: Record<ShelfStatus | "all", number> = {
    all: entries.length,
    read: 0,
    reading: 0,
    want: 0,
    abandoned: 0,
  };
  for (const entry of entries) counts[entry.status] += 1;
  return counts;
}

/** Os gêneros que aparecem na estante, do mais comum ao menos. */
export function genreOptions(entries: readonly ShelfEntry[]) {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const genre of entry.genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .flatMap(([slug, count]) => {
      const label = genreLabel(slug);
      return label ? [{ value: slug, label, count }] : [];
    })
    .sort((a, b) => b.count - a.count || collator.compare(a.label, b.label));
}

/** "Anos 90", "Anos 2010", "Anos 1890": a década vira um rótulo curto. */
export function decadeLabel(decade: number) {
  return decade >= 1920 && decade < 2000
    ? `Anos ${String(decade).slice(2)}`
    : `Anos ${decade}`;
}

/** As décadas de publicação que aparecem na estante, da mais antiga à mais nova. */
export function decadeOptions(entries: readonly ShelfEntry[]) {
  const counts = new Map<number, number>();
  for (const entry of entries) {
    const decade = decadeOf(entry.book.publishedYear);
    if (decade !== null) counts.set(decade, (counts.get(decade) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([decade, count]) => ({
      value: decade,
      label: decadeLabel(decade),
      count,
    }));
}
