import type { ManualBook } from "../schemas";

/** Os campos que uma edição muda, como as colunas de books (apply_book_changes). */
export const EDITABLE_FIELDS = [
  "title",
  "subtitle",
  "authors",
  "description",
  "page_count",
  "published_year",
  "isbn_13",
] as const;

export type EditableField = (typeof EDITABLE_FIELDS)[number];

export const FIELD_LABEL: Record<EditableField, string> = {
  title: "Título",
  subtitle: "Subtítulo",
  authors: "Autoria",
  description: "Sinopse",
  page_count: "Páginas",
  published_year: "Ano",
  isbn_13: "ISBN-13",
};

/** O formulário do livro (já validado) no formato das colunas. */
export function proposedFields(
  fields: ManualBook,
  description: string | null,
): Record<EditableField, unknown> {
  return {
    title: fields.title,
    subtitle: fields.subtitle,
    authors: fields.authors,
    description,
    page_count: fields.pageCount,
    published_year: fields.publishedYear,
    isbn_13: fields.isbn13,
  };
}

/** Só o que mudou em relação ao livro de agora, e o que era antes. */
export function diffFields(
  current: Partial<Record<EditableField, unknown>>,
  proposed: Record<EditableField, unknown>,
) {
  const changes: Record<string, unknown> = {};
  const base: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    const before = current[key] ?? null;
    const after = proposed[key] ?? null;
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes[key] = after;
      base[key] = before;
    }
  }
  return { changes, base };
}

/** Um valor de campo para mostrar no diff. */
export function showField(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
