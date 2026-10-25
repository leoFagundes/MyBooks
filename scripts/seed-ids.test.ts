import { describe, expect, test } from "vitest";
import { seedId } from "./seed-ids";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("ids do seed", () => {
  test("viram um UUID válido", () => {
    expect(seedId("book", "dom-casmurro")).toMatch(UUID);
    expect(seedId("user", "ana")).toMatch(UUID);
  });

  test("o mesmo slug dá sempre o mesmo id", () => {
    expect(seedId("book", "dom-casmurro")).toBe(seedId("book", "dom-casmurro"));
  });

  test("tipo ou slug diferente dá id diferente", () => {
    expect(seedId("book", "duna")).not.toBe(seedId("collection", "duna"));
    expect(seedId("book", "duna")).not.toBe(seedId("book", "1984"));
  });
});
