import "server-only";
import { updateTag } from "next/cache";
import type { BookRef } from "@/features/shelf/schemas";
import type { ActionResult } from "@/lib/action";
import { findExternalResult } from "../queries";
import { ensureCatalogBook } from "./catalog";

/**
 * O id do livro escolhido na paleta; um livro de fora entra no catálogo
 * agora. Nunca recebe os dados do livro do cliente: refaz a busca, do cache.
 * Só dentro de Server Action (chama updateTag).
 */
export async function catalogIdFor(
  book: BookRef,
  viewerId: string,
): Promise<ActionResult<string>> {
  if ("catalogId" in book) return { ok: true, data: book.catalogId };
  const result = await findExternalResult(
    book.query,
    book.source,
    book.sourceId,
  );
  if (!result) {
    return {
      ok: false,
      error: "Não achamos esse livro agora. Busque de novo.",
    };
  }
  try {
    const id = await ensureCatalogBook(result, viewerId);
    updateTag("catalog");
    return { ok: true, data: id };
  } catch {
    return {
      ok: false,
      error: "Não deu para trazer esse livro. Tente de novo.",
    };
  }
}
