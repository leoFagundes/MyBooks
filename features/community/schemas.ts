import { z } from "zod";
import { genreSlug } from "@/features/profile/lib/genre-name";

const body = (max: number) =>
  z
    .string({ error: "Escreva alguma coisa" })
    .trim()
    .min(1, "Escreva alguma coisa")
    .max(max, `Até ${max.toLocaleString("pt-BR")} caracteres`);

/** "Fantasia, clube do livro" vira ["fantasia", "clube-do-livro"]: até 5. */
export const tagsSchema = z
  .string()
  .transform((value) => [
    ...new Set(
      value
        .split(",")
        .map((tag) => genreSlug(tag))
        .filter((tag) => tag.length >= 2),
    ),
  ])
  .pipe(z.array(z.string()).max(5, "Até 5 tags"));

export const topicSchema = z.object({
  category: z.string().min(1, "Escolha a categoria"),
  title: z
    .string({ error: "Dê um título" })
    .trim()
    .min(3, "Um título com pelo menos 3 letras")
    .max(140, "Até 140 caracteres"),
  body: body(20000),
  tags: tagsSchema,
  containsSpoilers: z.boolean(),
  bookIds: z.array(z.uuid()).max(5, "Até 5 livros"),
});

export type TopicInput = z.input<typeof topicSchema>;

export const replySchema = z.object({
  topicId: z.uuid(),
  body: body(10000),
  parentId: z.uuid().nullable(),
  quotedReplyId: z.uuid().nullable(),
});

export type ReplyInput = z.input<typeof replySchema>;

export const reportSchema = z.object({
  targetType: z.enum(["topic", "reply", "suggestion", "suggestion_comment"]),
  targetId: z.uuid(),
  reason: z.enum(["spam", "ofensivo", "spoiler", "fora_do_tema", "outro"], {
    error: "Escolha o motivo",
  }),
  details: z.string().trim().max(500, "Até 500 caracteres"),
});

export type ReportInput = z.input<typeof reportSchema>;

/** As mensagens do anti-spam do banco (o hint diz qual regra barrou). */
export function postingError(
  error: { hint?: string | null; code?: string } | null,
  /** A mensagem da recusa por permissão (o tópico trancado, nas respostas). */
  denied = "Você não pode publicar aqui agora.",
): string {
  if (error?.hint === "rate_limit") {
    return "Calma: espere um minuto antes de publicar de novo.";
  }
  if (error?.hint === "links") {
    return "Links ficam liberados depois das suas três primeiras publicações.";
  }
  if (error?.code === "42501") return denied;
  return "Não deu para publicar agora. Tente de novo.";
}
