import { describe, expect, it } from "vitest";
import { formatNumber, NUMBER_LOCALE } from "./format";

describe("formatNumber", () => {
  it("separa milhares com ponto, como no Brasil", () => {
    expect(formatNumber(1204)).toBe("1.204");
    expect(formatNumber(1_000_000)).toBe("1.000.000");
  });

  it("deixa números pequenos como estão", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(87)).toBe("87");
  });

  it("usa a mesma localidade que o NumberFlow recebe", () => {
    expect(NUMBER_LOCALE).toBe("pt-BR");
  });
});
