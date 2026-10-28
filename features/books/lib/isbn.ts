import { pickIsbns } from "./search-result";

/**
 * O ISBN-13 de um código: um ISBN-13 com o dígito certo, ou um ISBN-10
 * convertido. Hífens e espaços não contam. Qualquer outra coisa: null.
 */
export const isbn13From = (code: string): string | null =>
  pickIsbns([code]).isbn13;

/** O ISBN-13 de uma busca que é só um ISBN (com ou sem hífens), ou null. */
export function isbnFromQuery(query: string): string | null {
  return /^[\d\s-]+[\dXx]?$/.test(query.trim()) ? isbn13From(query) : null;
}
