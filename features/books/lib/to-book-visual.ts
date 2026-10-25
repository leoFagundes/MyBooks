import type { Tables } from "@/lib/supabase/database.types";
import type { BookVisual } from "../types";

type BookRow = Pick<
  Tables<"books">,
  | "id"
  | "title"
  | "authors"
  | "cover_url"
  | "cover_color"
  | "page_count"
  | "published_year"
>;

const HEX_COLOR = /^#[0-9a-f]{6}$/;
// Por enquanto, só as capas da Open Library (seed e busca); as do nosso
// bucket chegam com o catálogo da Fase 3
const OPEN_LIBRARY_COVER =
  /^https:\/\/covers\.openlibrary\.org\/b\/(?:id|isbn|olid)\/[A-Za-z0-9]+-[SML]\.jpg$/;

/** A linha do catálogo no formato que capas e lombadas desenham. */
export function toBookVisual(row: BookRow): BookVisual {
  return {
    id: row.id,
    title: row.title,
    authors: row.authors,
    coverUrl:
      row.cover_url && OPEN_LIBRARY_COVER.test(row.cover_url)
        ? row.cover_url
        : null,
    coverColor:
      row.cover_color && HEX_COLOR.test(row.cover_color)
        ? row.cover_color
        : null,
    pageCount: row.page_count,
    publishedYear: row.published_year,
  };
}
