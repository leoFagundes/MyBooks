// A história do topo da landing, em trechos da rolagem da seção (0 a 1): o
// título sai, os livros voam até a prateleira enquanto a legenda se acende
// palavra por palavra, a linha se desenha, a prateleira de verdade assume por
// cima dos livros 3D, e o perfil toma o lugar da legenda. O DOM (HeroStage) e
// a cena 3D (os livros) leem os mesmos trechos.
export const TITLE_OUT = [0.02, 0.15];
export const FLIGHT = { start: 0.04, spread: 0.16, length: 0.34 };
export const LINE = [0.42, 0.54];
/** A prateleira da página aparece por cima dos livros 3D, ainda inteiros. */
export const SWAP = [0.54, 0.6];
/** Já coberta pela prateleira, a cena some (sem o fundo vazar no meio). */
export const HIDE_SCENE = [0.6, 0.62];
export const PROFILE = [0.58, 0.72];
/** A legenda só aparece com o título saindo: no topo, nem apagada se vê. */
export const CAPTION_IN = [0.1, 0.16];
/** A legenda do voo: cada palavra acende no seu pedaço deste trecho. */
export const CAPTION = { start: 0.14, end: 0.46, word: 0.05 };
/** A legenda se apaga logo antes de o perfil entrar no lugar dela. */
export const CAPTION_OUT = [0.5, 0.58];

/**
 * A história da rolagem só existe no computador: tela larga e mouse de
 * verdade. No celular e no tablet, o topo fica parado e os livros só flutuam.
 * O CSS espelha a mesma condição na variante `historia-parada`.
 */
export const STORY_MEDIA =
  "(min-width: 48rem) and (hover: hover) and (pointer: fine)";

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
