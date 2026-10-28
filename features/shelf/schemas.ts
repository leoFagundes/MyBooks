import { z } from "zod";

export const SHELF_STATUSES = ["read", "reading", "want", "abandoned"] as const;

export type ShelfStatus = (typeof SHELF_STATUSES)[number];

const statusSchema = z.enum(SHELF_STATUSES, { error: "Status inválido" });

/** Copiar de outra pessoa: Abandonado não faz sentido numa cópia. */
export const COPY_STATUSES = ["want", "reading", "read"] as const;
export type CopyStatus = (typeof COPY_STATUSES)[number];

export const copyBookSchema = z.object({
  bookId: z.uuid("Livro inválido"),
  status: z.enum(COPY_STATUSES, { error: "Status inválido" }),
  collectionId: z.uuid().nullable(),
  /** De quem é a estante de onde o livro saiu. */
  fromUserId: z.uuid(),
});
export type CopyBookInput = z.infer<typeof copyBookSchema>;

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
export function latestDay() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const daySchema = z.iso
  .date({ error: "Data inválida" })
  .refine((day) => day <= latestDay(), "Essa data ainda não chegou");

const detailsShape = {
  status: statusSchema,
  rating: ratingSchema.nullable(),
  startedAt: daySchema.nullable(),
  finishedAt: daySchema.nullable(),
};

type DetailsValues = {
  status: ShelfStatus;
  rating: number | null;
  startedAt: string | null;
  finishedAt: string | null;
};

// Quero ler não tem nota nem datas; lendo não tem fim; o fim vem depois
function coherentDetails(details: DetailsValues, ctx: z.RefinementCtx) {
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
}

/** Status, nota e datas de um livro na estante, coerentes entre si. */
export const shelfDetailsSchema = z
  .object(detailsShape)
  .superRefine(coherentDetails);

/**
 * O livro sorteado sai de Quero ler e passa a Lendo, com início no dia de
 * quem sorteou (o navegador sabe o dia; o servidor só conhece o UTC).
 */
export const startReadingSchema = z.object({
  bookId: z.uuid(),
  startedAt: daySchema,
});

/** A página em que a pessoa está (o check user_books_current_page_range). */
export const currentPageSchema = z
  .number({ error: "Página inválida" })
  .int("Página inválida")
  .min(0, "Página inválida")
  .max(20_000, "Página inválida");

/** O bloco da página do livro: o mesmo, mais a página em que a pessoa está. */
export const shelfEntryUpdateSchema = z
  .object({
    ...detailsShape,
    currentPage: currentPageSchema.nullable(),
  })
  .superRefine(coherentDetails);

export type ShelfEntryUpdate = z.input<typeof shelfEntryUpdateSchema>;

/** Resenha: até 10 mil caracteres; vazia apaga. */
export const reviewSchema = z
  .string()
  .trim()
  .max(10_000, "Até 10 mil caracteres")
  .transform((review) => review || null);

/** Citação: o trecho (até mil caracteres) e, se a pessoa quiser, a página. */
export const quoteSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Escreva o trecho")
    .max(1000, "Até mil caracteres"),
  page: z
    .number({ error: "Página inválida" })
    .int("Página inválida")
    .min(1, "Página inválida")
    .max(20_000, "Página inválida")
    .nullable(),
});

export type QuoteInput = z.input<typeof quoteSchema>;

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

/**
 * Um livro da exportação do Goodreads, já traduzido para a estante. A data
 * não passa pelo "ainda não chegou": o servidor descarta a que vier adiante.
 */
export const importedBookSchema = z.object({
  title: z.string().trim().min(1).max(300),
  authors: z.array(z.string().trim().min(1).max(200)).max(10),
  isbn13: z
    .string()
    .regex(/^97[89]\d{10}$/)
    .nullable(),
  pageCount: z.number().int().min(1).max(20_000).nullable(),
  publishedYear: z.number().int().min(1).max(2100).nullable(),
  status: statusSchema,
  rating: z.number().int().min(1).max(5).nullable(),
  finishedAt: z.iso.date().nullable(),
  review: z.string().max(10_000).nullable(),
});

export type ImportedBook = z.infer<typeof importedBookSchema>;

/** Até 5 livros por chamada: cada um pode esperar a Open Library. */
export const IMPORT_BATCH = 5;

export const importBatchSchema = z
  .array(importedBookSchema)
  .min(1)
  .max(IMPORT_BATCH);
