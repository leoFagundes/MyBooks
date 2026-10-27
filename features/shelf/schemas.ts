import { z } from "zod";

export const SHELF_STATUSES = ["read", "reading", "want", "abandoned"] as const;

export type ShelfStatus = (typeof SHELF_STATUSES)[number];

const statusSchema = z.enum(SHELF_STATUSES, { error: "Status inválido" });

export const shelfEntrySchema = z.object({
  bookId: z.uuid("Livro inválido"),
  status: statusSchema,
});

/** De 0,5 a 5, em meias estrelas (o check user_books_rating_halves). */
export const ratingSchema = z
  .number({ error: "Nota inválida" })
  .min(0.5, "A nota vai de meia a cinco estrelas")
  .max(5, "A nota vai de meia a cinco estrelas")
  .multipleOf(0.5, "A nota anda de meia em meia estrela");

// Um dia de folga: o servidor conta em UTC, e a pessoa pode estar adiante dele
function latestDay() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const daySchema = z.iso
  .date({ error: "Data inválida" })
  .refine((day) => day <= latestDay(), "Essa data ainda não chegou");

/** Status, nota e datas de um livro na estante, coerentes entre si. */
export const shelfDetailsSchema = z
  .object({
    status: statusSchema,
    rating: ratingSchema.nullable(),
    startedAt: daySchema.nullable(),
    finishedAt: daySchema.nullable(),
  })
  .superRefine((details, ctx) => {
    if (details.status === "want") {
      if (details.rating !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["rating"],
          message: "Livro que você quer ler ainda não tem nota",
        });
      }
      if (details.startedAt !== null || details.finishedAt !== null) {
        ctx.addIssue({
          code: "custom",
          path: ["startedAt"],
          message: "Livro que você quer ler ainda não tem datas",
        });
      }
    }
    if (details.status === "reading" && details.finishedAt !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["finishedAt"],
        message: "Quem está lendo ainda não terminou",
      });
    }
    if (
      details.startedAt &&
      details.finishedAt &&
      details.finishedAt < details.startedAt
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["finishedAt"],
        message: "O fim vem depois do começo",
      });
    }
  });

export type ShelfDetails = z.infer<typeof shelfDetailsSchema>;

/**
 * O livro escolhido: pelo id do catálogo, ou pela obra numa fonte junto com a
 * busca que a achou. Os dados do livro nunca vêm do cliente: o servidor refaz
 * a busca (que está no cache) e pega o resultado de lá.
 */
export const bookRefSchema = z.union([
  z.object({ catalogId: z.uuid("Livro inválido") }),
  z.object({
    source: z.enum(["openlibrary", "google"], { error: "Fonte inválida" }),
    sourceId: z.string().trim().min(1).max(64),
    query: z.string().trim().min(2).max(100),
  }),
]);

export type BookRef = z.infer<typeof bookRefSchema>;

export const addBookSchema = z.object({
  book: bookRefSchema,
  details: shelfDetailsSchema,
});

export type AddBookInput = z.input<typeof addBookSchema>;
