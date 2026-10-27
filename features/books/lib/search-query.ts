const MAX_LENGTH = 100;

/**
 * A consulta como chave do cache: aparada, sem espaço repetido e minúscula,
 * com no máximo 100 caracteres (título e autor cabem com folga).
 */
export function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase().slice(0, MAX_LENGTH);
}
