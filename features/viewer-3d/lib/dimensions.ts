// Medidas do livro em 3D, em unidades do mundo. A capa tem os 2:3 da capa 2D,
// e a espessura vem do número de páginas (spec §5.7): uns 0,05mm por página
// num livro de 23cm, entre um folheto e um tijolo.
const DEFAULT_PAGES = 280;
const DEPTH_PER_PAGE = 0.00065;
const MIN_PAGES_DEPTH = 0.06;
const MAX_PAGES_DEPTH = 0.75;
const BOARD = 0.025;
const OVERHANG = 0.04;

export type BookDimensions = {
  /** Largura da capa. */
  width: number;
  /** Altura da capa. */
  height: number;
  /** Espessura do miolo. */
  pagesDepth: number;
  /** Espessura de cada placa da capa dura. */
  board: number;
  /** Quanto as placas sobram além do miolo, em cima, embaixo e na frente. */
  overhang: number;
  /** Espessura total: o miolo e as duas placas. */
  depth: number;
};

export function bookDimensions(pageCount: number | null): BookDimensions {
  const pages = pageCount && pageCount > 0 ? pageCount : DEFAULT_PAGES;
  const pagesDepth = Math.min(
    MAX_PAGES_DEPTH,
    Math.max(MIN_PAGES_DEPTH, pages * DEPTH_PER_PAGE),
  );
  return {
    width: 2,
    height: 3,
    pagesDepth,
    board: BOARD,
    overhang: OVERHANG,
    depth: pagesDepth + 2 * BOARD,
  };
}
