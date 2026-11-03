import { z } from "zod";
import { COVER_STYLES } from "./lib/cover-style";
import { BOOK_LIMITS, pickIsbns } from "./lib/search-result";

const squish = (text: string) => text.replace(/\s+/g, " ").trim();
// Conta caracteres como o char_length do Postgres
const chars = (text: string) => [...text].length;

/** Campo de número opcional: vazio vira null; o resto, inteiro no limite. */
function optionalInteger(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (!value) return null;
      const number = /^\d+$/.test(value) ? Number(value) : Number.NaN;
      if (number >= min && number <= max) return number;
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    });
}

/**
 * Livro cadastrado à mão. Os campos chegam como o formulário os tem (texto) e
 * saem no formato das colunas de books.
 */
export const manualBookSchema = z
  .object({
    title: z
      .string()
      .transform(squish)
      .refine((title) => title.length > 0, "Dê um título ao livro")
      .refine(
        (title) => chars(title) <= BOOK_LIMITS.title,
        `Até ${BOOK_LIMITS.title} caracteres`,
      ),
    subtitle: z
      .string()
      .transform(squish)
      .refine(
        (subtitle) => chars(subtitle) <= BOOK_LIMITS.subtitle,
        `Até ${BOOK_LIMITS.subtitle} caracteres`,
      )
      .transform((subtitle) => subtitle || null),
    authors: z
      .string()
      .transform((value) => value.split(",").map(squish).filter(Boolean))
      .refine(
        (authors) => authors.length <= BOOK_LIMITS.authors,
        `Até ${BOOK_LIMITS.authors} nomes`,
      )
      .refine(
        (authors) => authors.every((name) => chars(name) <= BOOK_LIMITS.author),
        "Algum nome passou do tamanho",
      ),
    publishedYear: optionalInteger(
      BOOK_LIMITS.minYear,
      BOOK_LIMITS.maxYear,
      "Use um ano entre 1 e 2100",
    ),
    pageCount: optionalInteger(
      1,
      BOOK_LIMITS.maxPages,
      "Use de 1 a 20.000 páginas",
    ),
    isbn: z.string().trim(),
  })
  .transform(({ isbn, ...book }, ctx) => {
    const isbns = isbn ? pickIsbns([isbn]) : { isbn13: null, isbn10: null };
    if (isbn && !isbns.isbn13) {
      ctx.addIssue({
        code: "custom",
        path: ["isbn"],
        message: "ISBN inválido",
      });
      return z.NEVER;
    }
    return { ...book, ...isbns };
  });

export type ManualBookFields = z.input<typeof manualBookSchema>;
export type ManualBook = z.output<typeof manualBookSchema>;

/** A capa tipográfica escolhida no cadastro e na edição. */
export const coverDesignSchema = z.object({
  /** null: a cor automática, derivada do título. */
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/, "Escolha uma cor válida")
    .nullable(),
  style: z.enum(COVER_STYLES),
});

export type CoverDesign = z.infer<typeof coverDesignSchema>;

const reason = z
  .string({ error: "Conte o motivo" })
  .trim()
  .min(3, "Conte o motivo")
  .max(1000, "Até 1.000 caracteres");

/** Sugerir edição (MELHORIAS 7): os campos do livro, mais a sinopse, e o motivo. */
export const suggestEditSchema = z.object({
  bookId: z.uuid("Livro inválido"),
  fields: manualBookSchema,
  description: z
    .string()
    .trim()
    .max(5000, "Até 5.000 caracteres")
    .transform((description) => description || null),
  reason,
});

export type SuggestEditInput = {
  bookId: string;
  fields: ManualBookFields;
  description: string;
  reason: string;
};

export const DELETE_KINDS = [
  { value: "duplicado", label: "É duplicado de outro livro" },
  { value: "improprio", label: "Conteúdo impróprio" },
  { value: "inexistente", label: "O livro não existe" },
  { value: "outro", label: "Outro motivo" },
] as const;

export type DeleteKind = (typeof DELETE_KINDS)[number]["value"];

/** Sugerir exclusão: o duplicado leva o livro que fica (vira uma mescla). */
export const suggestDeleteSchema = z
  .object({
    bookId: z.uuid("Livro inválido"),
    kind: z.enum(
      DELETE_KINDS.map((kind) => kind.value) as [DeleteKind, ...DeleteKind[]],
      { error: "Escolha o motivo" },
    ),
    duplicateOf: z.uuid("Escolha o livro").nullable(),
    reason,
  })
  .refine((input) => input.kind !== "duplicado" || input.duplicateOf, {
    path: ["duplicateOf"],
    message: "Escolha de qual livro ele é duplicado",
  })
  .refine((input) => input.duplicateOf !== input.bookId, {
    path: ["duplicateOf"],
    message: "Escolha outro livro",
  });
