import { z } from "zod";

export const SHELF_STATUSES = ["read", "reading", "want", "abandoned"] as const;

export type ShelfStatus = (typeof SHELF_STATUSES)[number];

export const shelfEntrySchema = z.object({
  bookId: z.uuid("Livro inválido"),
  status: z.enum(SHELF_STATUSES, { error: "Status inválido" }),
});
