import { hashString } from "./hash";

const MIN_WIDTH = 18;
const MAX_WIDTH = 56;
const DEFAULT_PAGES = 280;

/** Largura da lombada em px: 16 + 0,05 por página, entre 18 e 56 (spec §4). */
export function spineWidth(pageCount: number | null) {
  const pages = pageCount && pageCount > 0 ? pageCount : DEFAULT_PAGES;
  return Math.min(
    MAX_WIDTH,
    Math.max(MIN_WIDTH, Math.round(16 + pages * 0.05)),
  );
}

/** Altura entre 160 e 192px, na grade de 4px, sempre a mesma para o livro. */
export function spineHeight(id: string) {
  return 160 + (hashString(id) % 9) * 4;
}

const SHIFTS = [0, 6, 4, 2];

/**
 * Quanto uma lombada se afasta da que está em destaque, pela distância com
 * sinal (negativa à esquerda): 6, 4 e 2px, sempre para o lado de fora.
 */
export function neighborShift(distance: number) {
  const amount = SHIFTS[Math.abs(distance)] ?? 0;
  return amount === 0 ? 0 : Math.sign(distance) * amount;
}
