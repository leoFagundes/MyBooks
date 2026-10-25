// Gêneros do MyBooks: os favoritos do perfil e os do catálogo usam os mesmos
// slugs (o banco só confere o formato, em private.are_slugs)
export const GENRES = [
  { slug: "literatura-brasileira", label: "Literatura brasileira" },
  { slug: "classicos", label: "Clássicos" },
  { slug: "ficcao", label: "Ficção" },
  { slug: "romance", label: "Romance" },
  { slug: "contos", label: "Contos" },
  { slug: "poesia", label: "Poesia" },
  { slug: "fantasia", label: "Fantasia" },
  { slug: "ficcao-cientifica", label: "Ficção científica" },
  { slug: "distopia", label: "Distopia" },
  { slug: "terror", label: "Terror" },
  { slug: "misterio", label: "Mistério" },
  { slug: "realismo-magico", label: "Realismo mágico" },
  { slug: "historia", label: "História" },
  { slug: "biografia", label: "Biografias e memórias" },
  { slug: "ciencia", label: "Ciência" },
  { slug: "filosofia", label: "Filosofia" },
  { slug: "quadrinhos", label: "Quadrinhos" },
  { slug: "infantojuvenil", label: "Infantojuvenil" },
] as const;

export type GenreSlug = (typeof GENRES)[number]["slug"];

export const GENRE_SLUGS: readonly GenreSlug[] = GENRES.map(
  (genre) => genre.slug,
);

export function genreLabel(slug: string): string | null {
  return GENRES.find((genre) => genre.slug === slug)?.label ?? null;
}
