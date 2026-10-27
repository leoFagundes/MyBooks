/**
 * Raio da capa, igual a --radius-cover. Vai no style da capa porque o Motion
 * só corrige a distorção do raio, enquanto a capa viaja entre vistas, quando
 * recebe o valor em px.
 */
export const COVER_RADIUS_PX = 3;

/** Capa da Open Library (S, M ou L): o check books_cover_source aceita a mesma. */
export const OPEN_LIBRARY_COVER_URL =
  /^https:\/\/covers\.openlibrary\.org\/b\/(?:id|isbn|olid)\/[A-Za-z0-9]+-[SML]\.jpg$/;

/**
 * As três larguras de cada capa no bucket covers (covers/<id do livro>/S.webp,
 * M.webp e L.webp). Cobrem da lista (40px) à capa grande da página do livro em
 * tela de 2x.
 */
export const COVER_FILES = [
  { name: "S", width: 96 },
  { name: "M", width: 240 },
  { name: "L", width: 480 },
] as const;
