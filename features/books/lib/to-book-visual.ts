import { getPublicEnv } from "@/lib/env";
import type { Tables } from "@/lib/supabase/database.types";
import type { BookVisual } from "../types";
import { OPEN_LIBRARY_COVER_URL } from "./cover";

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

function coverSrc(row: BookRow): string | null {
  if (!row.cover_url) return null;
  if (OPEN_LIBRARY_COVER_URL.test(row.cover_url)) return row.cover_url;
  // A pasta do próprio livro no bucket; o loader do next/image escolhe a largura
  if (row.cover_url === `covers/${row.id}`) {
    const base = getPublicEnv().supabaseUrl.replace(/\/$/, "");
    return `${base}/storage/v1/object/public/covers/${row.id}`;
  }
  return null;
}

/** A linha do catálogo no formato que capas e lombadas desenham. */
export function toBookVisual(row: BookRow): BookVisual {
  return {
    id: row.id,
    title: row.title,
    authors: row.authors,
    coverUrl: coverSrc(row),
    coverColor:
      row.cover_color && HEX_COLOR.test(row.cover_color)
        ? row.cover_color
        : null,
    pageCount: row.page_count,
    publishedYear: row.published_year,
  };
}
