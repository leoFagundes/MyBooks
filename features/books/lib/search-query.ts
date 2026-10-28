import { isbnFromQuery } from "./isbn";

const MAX_LENGTH = 100;

/**
 * A consulta como chave do cache: aparada, sem espaço repetido e minúscula,
 * com no máximo 100 caracteres (título e autor cabem com folga). Um ISBN, com
 * ou sem hífens, vira o ISBN-13: o de 10 e o de 13 acham a mesma edição.
 */
export function normalizeQuery(query: string): string {
  const text = query
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .slice(0, MAX_LENGTH);
  return isbnFromQuery(text) ?? text;
}
