import { z } from "zod";
import { FEATURE_FLAGS } from "./lib/settings";

const userId = z.uuid("Usuário inválido");
const reason = z
  .string({ error: "Diga o motivo" })
  .trim()
  .min(3, "Diga o motivo")
  .max(500, "Até 500 caracteres");

/** Suspender (com prazo, em dias) ou banir (sem prazo), sempre com o motivo. */
export const sanctionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("suspension"),
    userId,
    reason,
    days: z.coerce
      .number({ error: "Prazo inválido" })
      .int("Prazo inválido")
      .min(1, "Pelo menos 1 dia")
      .max(365, "Até 365 dias"),
  }),
  z.object({ kind: z.literal("ban"), userId, reason }),
]);

export const liftSanctionSchema = z.object({ userId, reason });

export const CONTENT_PARTS = ["perfil", "resenhas", "citacoes"] as const;
export type ContentPart = (typeof CONTENT_PARTS)[number];

export const removeContentSchema = z.object({
  userId,
  reason,
  parts: z
    .array(z.enum(CONTENT_PARTS))
    .min(1, "Escolha o que remover")
    .transform((parts) => [...new Set(parts)]),
});

export const moderatorSchema = z.object({ userId, moderator: z.boolean() });

export const bannerSchema = z.object({
  enabled: z.boolean(),
  message: z.string().trim().max(200, "Até 200 caracteres"),
  tone: z.enum(["info", "aviso"]),
});

export const maintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().trim().max(300, "Até 300 caracteres"),
});

export const featuresSchema = z.object(
  Object.fromEntries(FEATURE_FLAGS.map(({ key }) => [key, z.boolean()])) as {
    [K in (typeof FEATURE_FLAGS)[number]["key"]]: z.ZodBoolean;
  },
);

/** A revisão de um livro manual (MELHORIAS 7). */
export const reviewBookSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approve"),
    bookId: z.uuid("Livro inválido"),
  }),
  z.object({
    decision: z.literal("reject"),
    bookId: z.uuid("Livro inválido"),
    note: reason,
  }),
  z.object({
    decision: z.literal("merge"),
    bookId: z.uuid("Livro inválido"),
    duplicateOf: z.uuid("Escolha o livro que fica"),
    note: z.string().trim().max(500, "Até 500 caracteres").optional(),
  }),
]);

/** Rejeitar pede a nota; aprovar, não. */
export const reviewRequestSchema = z
  .object({
    requestId: z.uuid("Sugestão inválida"),
    approve: z.boolean(),
    note: z.string().trim().max(1000, "Até 1.000 caracteres"),
  })
  .refine((input) => input.approve || input.note.length >= 3, {
    path: ["note"],
    message: "Diga por que a sugestão não foi aceita",
  });

export const reviewGenreSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Gênero inválido"),
  approve: z.boolean(),
  note: z.string().trim().max(500, "Até 500 caracteres"),
});
