import { genreLabel } from "@/features/profile/genres";

const list = new Intl.ListFormat("pt-BR", { type: "conjunction" });

/** "Lê Clássicos, Contos e Fantasia": os três primeiros gêneros favoritos. */
export function readsLine(favoriteGenres: string[]) {
  const labels = favoriteGenres
    .slice(0, 3)
    .flatMap((slug) => genreLabel(slug) ?? []);
  return labels.length > 0 ? `Lê ${list.format(labels)}` : null;
}
