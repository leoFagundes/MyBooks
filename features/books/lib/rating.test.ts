import { describe, expect, test } from "vitest";
import { ratingAt, ratingLabel, stepRating } from "./rating";

describe("ratingAt", () => {
  test("a posição do ponteiro nas cinco estrelas vira meias estrelas", () => {
    expect(ratingAt(0)).toBe(0.5);
    expect(ratingAt(0.05)).toBe(0.5);
    expect(ratingAt(0.11)).toBe(1);
    expect(ratingAt(0.69)).toBe(3.5);
    expect(ratingAt(0.71)).toBe(4);
    expect(ratingAt(1)).toBe(5);
    expect(ratingAt(1.3)).toBe(5);
  });
});

describe("stepRating", () => {
  test("setas andam meia estrela; sem nota, a primeira seta dá meia", () => {
    expect(stepRating(null, "ArrowRight")).toBe(0.5);
    expect(stepRating(3, "ArrowRight")).toBe(3.5);
    expect(stepRating(3, "ArrowUp")).toBe(3.5);
    expect(stepRating(3, "ArrowLeft")).toBe(2.5);
    expect(stepRating(5, "ArrowRight")).toBe(5);
  });

  test("abaixo de meia estrela, a nota sai", () => {
    expect(stepRating(0.5, "ArrowLeft")).toBeNull();
    expect(stepRating(null, "ArrowDown")).toBeNull();
  });

  test("Home, End, números e Delete", () => {
    expect(stepRating(3, "Home")).toBe(0.5);
    expect(stepRating(null, "End")).toBe(5);
    expect(stepRating(null, "4")).toBe(4);
    expect(stepRating(2, "Delete")).toBeNull();
    expect(stepRating(2, "Backspace")).toBeNull();
  });

  test("outras teclas não mexem na nota", () => {
    expect(stepRating(2, "Enter")).toBeUndefined();
    expect(stepRating(2, "7")).toBeUndefined();
  });
});

describe("ratingLabel", () => {
  test("em português, com vírgula", () => {
    expect(ratingLabel(null)).toBe("Sem nota");
    expect(ratingLabel(1)).toBe("1 estrela");
    expect(ratingLabel(0.5)).toBe("0,5 estrela");
    expect(ratingLabel(3.5)).toBe("3,5 estrelas");
  });
});
