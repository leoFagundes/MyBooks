import { describe, expect, test } from "vitest";
import {
  applyMovePlan,
  firstPositions,
  type MovePlan,
  planMove,
  POSITION_PATTERN,
  positionBetween,
} from "./position";

type Item = { id: string; position: string };

// O Postgres ordena com collate "C", byte a byte; em ASCII é o sort padrão
const byPosition = (items: Item[]) =>
  [...items].sort((a, b) =>
    a.position === b.position
      ? a.id < b.id
        ? -1
        : 1
      : a.position < b.position
        ? -1
        : 1,
  );

function apply(items: Item[], plan: MovePlan): Item[] {
  if (plan.kind === "move") {
    return items.map((item) =>
      item.id === plan.id ? { ...item, position: plan.position } : item,
    );
  }
  return plan.order.map((id, i) => ({ id, position: plan.positions[i] }));
}

function arrayMove<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// Gerador com semente (mulberry32): uma falha pode ser repetida
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ids = (items: Item[]) => items.map((item) => item.id);

describe("firstPositions", () => {
  test("chaves crescentes pela ordem de byte", () => {
    expect(firstPositions(3)).toEqual(["a0", "a1", "a2"]);
    expect(firstPositions(0)).toEqual([]);
  });
});

describe("positionBetween", () => {
  test("antes da primeira, depois da última e no meio", () => {
    const first = positionBetween(null, "a0");
    const last = positionBetween("a2", null);
    const middle = positionBetween("a0", "a1");
    expect(first < "a0").toBe(true);
    expect(last > "a2").toBe(true);
    expect("a0" < middle && middle < "a1").toBe(true);
    for (const key of [first, last, middle]) {
      expect(key).toMatch(POSITION_PATTERN);
    }
  });
});

describe("planMove", () => {
  const start = (count: number): Item[] =>
    firstPositions(count).map((position, i) => ({
      id: `livro-${i}`,
      position,
    }));

  test("mover para o mesmo lugar não muda nada", () => {
    expect(planMove(start(4), 2, 2)).toBeNull();
  });

  test("300 movimentos aleatórios deixam as chaves na ordem pretendida", () => {
    const next = random(42);
    let items = start(8);
    for (let step = 0; step < 300; step++) {
      const from = Math.floor(next() * items.length);
      const to = Math.floor(next() * items.length);
      const intended = arrayMove(ids(items), from, to);
      const plan = planMove(items, from, to);
      if (plan) items = byPosition(apply(items, plan));
      expect(ids(items)).toEqual(intended);
      expect(items.every((item) => POSITION_PATTERN.test(item.position))).toBe(
        true,
      );
    }
  });

  test("vizinhas com a mesma chave: renumera tudo na ordem pretendida", () => {
    // Duas pessoas moveram para a mesma fresta ao mesmo tempo
    const items: Item[] = [
      { id: "a", position: "a0" },
      { id: "b", position: "a1" },
      { id: "c", position: "a1" },
      { id: "d", position: "a2" },
    ];
    const plan = planMove(items, 3, 2);
    expect(plan).toEqual({
      kind: "rebalance",
      order: ["a", "b", "d", "c"],
      positions: firstPositions(4),
    });
  });

  test("um empate fora da fresta de destino não atrapalha o movimento", () => {
    const items: Item[] = [
      { id: "a", position: "a0" },
      { id: "b", position: "a1" },
      { id: "c", position: "a1" },
      { id: "d", position: "a2" },
    ];
    const plan = planMove(items, 3, 1);
    expect(plan).toMatchObject({ kind: "move", id: "d" });
    const position = plan?.kind === "move" ? plan.position : "";
    expect("a0" < position && position < "a1").toBe(true);
  });

  test("inserir sempre na mesma fresta renumera antes de a chave crescer demais", () => {
    let items = start(3);
    let rebalanced = false;
    for (let step = 0; step < 400; step++) {
      // O último vai sempre para logo depois do primeiro
      const plan = planMove(items, items.length - 1, 1);
      if (plan?.kind === "rebalance") rebalanced = true;
      if (plan) items = byPosition(apply(items, plan));
      expect(items.every((item) => item.position.length <= 64)).toBe(true);
    }
    expect(rebalanced).toBe(true);
  });
});

describe("applyMovePlan", () => {
  type Book = { book: { id: string }; position: string; note: string };
  const books: Book[] = firstPositions(3).map((position, i) => ({
    book: { id: `livro-${i}` },
    position,
    note: `nota ${i}`,
  }));
  const idOf = (item: Book) => item.book.id;

  test("um movimento muda só a chave do livro e reordena", () => {
    const plan = planMove(
      books.map((b) => ({ id: idOf(b), position: b.position })),
      2,
      0,
    );
    if (!plan) throw new Error("devia mover");
    const moved = applyMovePlan(books, plan, idOf);
    expect(moved.map(idOf)).toEqual(["livro-2", "livro-0", "livro-1"]);
    expect(moved.map((b) => b.note)).toEqual(["nota 2", "nota 0", "nota 1"]);
  });

  test("a renumeração dá chaves novas na ordem do plano", () => {
    const plan: MovePlan = {
      kind: "rebalance",
      order: ["livro-1", "livro-2", "livro-0"],
      positions: firstPositions(3),
    };
    const moved = applyMovePlan(books, plan, idOf);
    expect(moved.map(idOf)).toEqual(["livro-1", "livro-2", "livro-0"]);
    expect(moved.map((b) => b.position)).toEqual(firstPositions(3));
  });
});
