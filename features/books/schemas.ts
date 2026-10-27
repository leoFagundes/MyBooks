import { z } from "zod";
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
