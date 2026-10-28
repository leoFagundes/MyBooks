/**
 * Um item ao acaso, com chance igual para todos (crypto.getRandomValues, sem
 * o viés do módulo). Com `avoid` e mais de um item, ele fica de fora: o
 * "Sortear de novo" não repete o último.
 */
export function pickRandom<T>(items: readonly T[], avoid?: T): T {
  const pool =
    avoid !== undefined && items.length > 1
      ? items.filter((item) => item !== avoid)
      : items;
  if (pool.length === 0) throw new Error("Nada para sortear");
  // Descarta o fim da faixa, que não se divide por igual entre os itens
  const limit = 2 ** 32 - (2 ** 32 % pool.length);
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value);
  while ((value[0] ?? 0) >= limit);
  return pool[(value[0] ?? 0) % pool.length] as T;
}
