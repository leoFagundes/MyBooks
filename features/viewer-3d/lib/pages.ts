import type { CommunityQuote } from "@/features/books/queries";

/** No máximo três folhas para virar: seis páginas. */
export const MAX_LEAVES = 3;

export type PageLayout = {
  /** Quantas folhas se viram (0: a folha de rosto fica no miolo, parada). */
  leafCount: number;
  /**
   * As faces das folhas, na ordem: frente da 1ª, verso da 1ª, frente da 2ª…
   * A primeira é sempre a folha de rosto (null aqui); as outras, as citações
   * depois da primeira, ou null para papel em branco.
   */
  faces: (CommunityQuote | null)[];
};

/**
 * Folhear (spec §5.7): a folha de rosto leva a primeira citação, e as outras
 * vão para as páginas seguintes, uma por página. Sem citação extra, não há
 * folha para virar.
 */
export function pageLayout(quotes: CommunityQuote[]): PageLayout {
  const extra = quotes.slice(1);
  if (extra.length === 0) return { leafCount: 0, faces: [] };
  const leafCount = Math.min(MAX_LEAVES, 1 + Math.ceil((extra.length - 1) / 2));
  const faces = Array.from({ length: leafCount * 2 }, (_, index) =>
    index === 0 ? null : (extra[index - 1] ?? null),
  );
  return { leafCount, faces };
}
