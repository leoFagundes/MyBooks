import type { BookDimensions } from "./dimensions";

export type Size = { width: number; height: number };
export type Rect = { left: number; top: number; width: number; height: number };

export type Framing = {
  /** A capa vista de frente no zoom 1, em px da tela: o destino do clone 2D. */
  cover: Rect;
  /** O palco: a tela menos o título em cima e a pílula embaixo. */
  stage: Rect;
  /** Da câmera até a face da capa, no zoom 1, em unidades do mundo. */
  distance: number;
  /** Quantos px a projeção sobe para o centro do palco ser o centro da imagem. */
  viewOffsetY: number;
};

/** Campo de visão vertical: estreito, de foto de produto, quase sem distorção. */
export const CAMERA_FOV = 30;

// Aberto, o livro ocupa quase duas capas de largura
const SPREAD_WIDTH = 2;
// Palco a partir do qual as duas páginas cabem lado a lado
const SPREAD_MIN = 1.8;
const SPREAD_FILL = 0.92;

const COVER_FILL = 0.8;
const SIDE_INSET = 24;
// Celular deitado: o título encolhe e a pílula desce
const COMPACT_HEIGHT = 520;

/**
 * Onde a capa 3D aparece de frente, e a que distância a câmera fica para isso.
 * O DOM usa o retângulo para o voo do clone, e a cena usa a distância e o
 * deslocamento: os dois saem da mesma conta, e a troca do 2D para o 3D não
 * salta.
 */
export function frameBook(viewport: Size, dims: BookDimensions): Framing {
  const compact = viewport.height < COMPACT_HEIGHT;
  const top = compact ? 12 : 72;
  const bottom = compact ? 76 : 104;
  const stage = {
    left: SIDE_INSET,
    top,
    width: Math.max(1, viewport.width - 2 * SIDE_INSET),
    height: Math.max(1, viewport.height - top - bottom),
  };

  const aspect = dims.width / dims.height;
  const height = Math.max(
    1,
    Math.min(stage.height * COVER_FILL, (stage.width * COVER_FILL) / aspect),
  );
  const width = height * aspect;
  const centerX = stage.left + stage.width / 2;
  const centerY = stage.top + stage.height / 2;

  // Na perspectiva, a face de altura H a uma distância d ocupa
  // H · altura da tela / (2 · d · tan(fov / 2)) px; daí sai a distância
  const tan = Math.tan((CAMERA_FOV * Math.PI) / 360);
  const distance = (dims.height * viewport.height) / (2 * tan * height);

  return {
    cover: {
      left: centerX - width / 2,
      top: centerY - height / 2,
      width,
      height,
    },
    stage,
    distance,
    viewOffsetY: viewport.height / 2 - centerY,
  };
}

/**
 * O livro aberto. Em tela larga, ele desliza meia capa para a direita (o meio
 * das duas páginas vai para o centro) e o zoom encaixa as duas; em tela
 * estreita, a câmera fica na página da direita, a folha de rosto.
 */
export function openFraming(dims: BookDimensions, framing: Framing) {
  const { stage, cover } = framing;
  if (stage.width < cover.width * SPREAD_MIN) return { zoom: 1, shiftX: 0 };
  return {
    zoom: Math.min(
      1,
      (stage.width * SPREAD_FILL) / (cover.width * SPREAD_WIDTH),
    ),
    shiftX: dims.width / 2,
  };
}

export type OpenFraming = ReturnType<typeof openFraming>;
