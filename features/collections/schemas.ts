import { z } from "zod";
import { POSITION_PATTERN } from "./lib/position";

/** Limites das colunas de coleções: a migration usa os mesmos. */
export const COLLECTION_LIMITS = {
  title: 80,
  description: 300,
  note: 200,
  members: 20,
} as const;

const graphemes = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });

/**
 * Um emoji só, contado como a pessoa vê: família com ZWJ, tom de pele e
 * bandeira valem um. Letras, dígitos e um indicador regional sozinho, não.
 */
export function isSingleEmoji(text: string): boolean {
  const segments = [...graphemes.segment(text)];
  if (segments.length !== 1) return false;
  const [{ segment }] = segments;
  return (
    /\p{Extended_Pictographic}/u.test(segment) ||
    /^\p{Regional_Indicator}{2}$/u.test(segment)
  );
}

export const collectionFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Dê um título à coleção")
    .max(COLLECTION_LIMITS.title, `Até ${COLLECTION_LIMITS.title} caracteres`),
  description: z
    .string()
    .trim()
    .max(
      COLLECTION_LIMITS.description,
      `Até ${COLLECTION_LIMITS.description} caracteres`,
    )
    .transform((description) => description || null),
  emoji: z
    .string()
    .trim()
    .refine((emoji) => emoji === "" || isSingleEmoji(emoji), "Um emoji só")
    .transform((emoji) => emoji || null),
  visibility: z.enum(["public", "private"]),
  isCollaborative: z.boolean(),
});

export type CollectionFormValues = z.input<typeof collectionFormSchema>;
export type CollectionFormData = z.output<typeof collectionFormSchema>;

export const itemNoteSchema = z
  .string()
  .trim()
  .max(COLLECTION_LIMITS.note, `Até ${COLLECTION_LIMITS.note} caracteres`)
  .transform((note) => note || null);

export const positionSchema = z.string().regex(POSITION_PATTERN);
