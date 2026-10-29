// O PostgREST devolve no máximo mil linhas por vez: listas longas (a estante
// de quem lê muito, o sitemap) vêm em páginas
const PAGE = 1000;

/** Todas as linhas de uma consulta, página por página; `limit` para antes. */
export async function fetchAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: unknown;
  }>,
  limit = Number.POSITIVE_INFINITY,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < limit; from += PAGE) {
    const to = Math.min(from + PAGE, limit) - 1;
    const { data, error } = await page(from, to);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < to - from + 1) break;
  }
  return rows;
}
