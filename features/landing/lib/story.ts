// A história do topo da landing, em trechos da rolagem da seção (0 a 1): o
// título sai, os livros voam até a prateleira, a linha se desenha, a
// prateleira de verdade assume e o perfil aparece. O DOM (HeroStage) e a cena
// 3D (os livros) leem os mesmos trechos.
export const TITLE_OUT = [0.03, 0.18];
export const FLIGHT = { start: 0.08, spread: 0.22, length: 0.32 };
export const LINE = [0.48, 0.62];
export const SWAP = [0.63, 0.69];
export const PROFILE = [0.69, 0.82];

/** Onde cada livro flutua no começo: frações do palco e a profundidade. */
export type Slot = { x: number; y: number; depth: number };

// Perto é maior; longe, menor. No celular, menos livros (8, como as lombadas)
export const WIDE_SLOTS: Slot[] = [
  { x: 0.08, y: 0.2, depth: 0.8 },
  { x: 0.2, y: 0.1, depth: 1 },
  { x: 0.35, y: 0.15, depth: 0.62 },
  { x: 0.65, y: 0.12, depth: 0.7 },
  { x: 0.8, y: 0.1, depth: 1.05 },
  { x: 0.93, y: 0.26, depth: 0.78 },
  { x: 0.06, y: 0.58, depth: 1.08 },
  { x: 0.94, y: 0.62, depth: 0.92 },
  { x: 0.14, y: 0.88, depth: 0.72 },
  { x: 0.32, y: 0.94, depth: 0.95 },
  { x: 0.7, y: 0.92, depth: 0.66 },
  { x: 0.86, y: 0.86, depth: 1.1 },
];
export const NARROW_SLOTS: Slot[] = [
  { x: 0.12, y: 0.12, depth: 0.9 },
  { x: 0.4, y: 0.07, depth: 0.66 },
  { x: 0.66, y: 0.1, depth: 1 },
  { x: 0.92, y: 0.15, depth: 0.74 },
  { x: 0.08, y: 0.88, depth: 0.76 },
  { x: 0.36, y: 0.94, depth: 1.02 },
  { x: 0.64, y: 0.91, depth: 0.7 },
  { x: 0.9, y: 0.86, depth: 0.94 },
];
