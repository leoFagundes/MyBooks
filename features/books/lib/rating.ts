import { formatNumber } from "@/lib/format";

export const MAX_RATING = 5;
const STEP = 0.5;

/** A posição do ponteiro nas cinco estrelas (de 0 a 1) vira a nota, em meias. */
export function ratingAt(fraction: number): number {
  const halves = Math.ceil(fraction * MAX_RATING * 2);
  return Math.min(MAX_RATING, Math.max(STEP, halves / 2));
}

/**
 * A nota depois de uma tecla, como num controle deslizante: setas andam meia
 * estrela, Home e End vão às pontas, 1 a 5 escolhem direto e Delete tira a
 * nota. undefined quando a tecla não mexe nela.
 */
export function stepRating(
  current: number | null,
  key: string,
): number | null | undefined {
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return Math.min(MAX_RATING, (current ?? 0) + STEP);
    case "ArrowLeft":
    case "ArrowDown": {
      const next = (current ?? 0) - STEP;
      return next < STEP ? null : next;
    }
    case "Home":
      return STEP;
    case "End":
      return MAX_RATING;
    case "Delete":
    case "Backspace":
      return null;
    default:
      return /^[1-5]$/.test(key) ? Number(key) : undefined;
  }
}

/** "3,5 estrelas", "1 estrela" (abaixo de 2, singular) ou "Sem nota". */
export function ratingLabel(rating: number | null): string {
  if (rating === null) return "Sem nota";
  return `${formatNumber(rating)} ${rating < 2 ? "estrela" : "estrelas"}`;
}
