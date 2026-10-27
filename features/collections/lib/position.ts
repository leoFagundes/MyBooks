import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

/** Chave de posição válida: base 62, como o fractional-indexing gera. */
export const POSITION_PATTERN = /^[0-9A-Za-z]{2,64}$/;

// Inserir sempre na mesma fresta alonga a chave; antes que fique comprida,
// a coleção é renumerada
const MAX_KEY_LENGTH = 32;

export type MovePlan =
  | { kind: "move"; id: string; position: string }
  | { kind: "rebalance"; order: string[]; positions: string[] };

/** Chaves para `count` livros, numa coleção nova ou renumerada. */
export function firstPositions(count: number): string[] {
  return generateNKeysBetween(null, null, count);
}

/** Uma chave entre as duas vizinhas (null: começo ou fim da lista). */
export function positionBetween(
  before: string | null,
  after: string | null,
): string {
  return generateKeyBetween(before, after);
}

/**
 * O que gravar para levar o livro de `from` a `to` (índices na ordem atual).
 * Quase sempre, uma chave nova só para ele, entre as vizinhas do destino. Se
 * elas têm a mesma chave (duas pessoas moveram para a mesma fresta ao mesmo
 * tempo) ou a chave nova ficaria comprida, renumera a coleção inteira na
 * ordem pretendida.
 */
export function planMove(
  items: readonly { id: string; position: string }[],
  from: number,
  to: number,
): MovePlan | null {
  const moving = items[from];
  if (!moving || from === to || to < 0 || to >= items.length) return null;

  const rest = items.filter((_, i) => i !== from);
  const before = rest[to - 1]?.position ?? null;
  const after = rest[to]?.position ?? null;
  const order = [...rest.slice(0, to), moving, ...rest.slice(to)].map(
    (item) => item.id,
  );
  const rebalance = (): MovePlan => ({
    kind: "rebalance",
    order,
    positions: firstPositions(order.length),
  });

  if (before !== null && after !== null && before >= after) return rebalance();
  const position = positionBetween(before, after);
  return position.length > MAX_KEY_LENGTH
    ? rebalance()
    : { kind: "move", id: moving.id, position };
}

/** A ordem do banco: posição byte a byte e, no empate, o id. */
export function byPosition<T extends { position: string }>(
  idOf: (item: T) => string,
) {
  return (a: T, b: T) => {
    if (a.position !== b.position) return a.position < b.position ? -1 : 1;
    return idOf(a) < idOf(b) ? -1 : 1;
  };
}

/** Os itens com as chaves do plano, já na nova ordem (para a UI otimista). */
export function applyMovePlan<T extends { position: string }>(
  items: readonly T[],
  plan: MovePlan,
  idOf: (item: T) => string,
): T[] {
  const positionOf = new Map(
    plan.kind === "move"
      ? [[plan.id, plan.position]]
      : plan.order.map((id, i) => [id, plan.positions[i] ?? ""]),
  );
  return items
    .map((item) => {
      const position = positionOf.get(idOf(item));
      return position ? { ...item, position } : item;
    })
    .sort(byPosition(idOf));
}
