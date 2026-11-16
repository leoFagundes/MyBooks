import { hashString } from "@/features/books/lib/hash";
import { spineHeight, spineWidth } from "@/features/books/lib/spine";
import type { BookVisual } from "@/features/books/types";
import { type BookDimensions, bookDimensionsForSpine } from "./dimensions";

// Onde cada livro da landing começa, sem three: a cena 3D e as capas que
// seguram o lugar dela enquanto ela carrega (HeroBooks) fazem a mesma conta,
// e a troca de uma pela outra não sai do lugar.

/** Onde o livro flutua no começo (frações do palco) e o quanto está perto. */
export type LandingSlot = { x: number; y: number; depth: number };

/** Um bloco de texto do título, em px no palco, que os livros não cobrem. */
export type LandingBlock = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type Stage = { width: number; height: number };

// Um px do palco vale 1/100 de unidade no plano z = 0, onde ficam as lombadas
export const PX = 100;
// Campo estreito: as lombadas no fim quase não mostram os lados
export const FOV = 22;
// O tamanho de partida, sobre o da lombada: no celular, menor; na tela larga,
// cheio a partir de FULL_WIDTH (px) e menor abaixo dela (no tablet em pé, os
// livros do tamanho do computador se amontoavam)
const NARROW_SCALE = 0.6;
const WIDE_SCALE = 0.95;
const FULL_WIDTH = 1280;
// A flutuação, em px no plano e em radianos
export const FLOAT_PX = 12;
export const FLOAT_TURN = 0.09;
// Sem a história, a cena acaba no meio da página e tem o texto no meio:
// cada livro, com a flutuação e mais esta folga (px), fica inteiro dentro
// dela e fora do texto, menor se o espaço for curto; se nem com esta fração
// do tamanho ele couber, fica de fora
const FLOAT_MARGIN = 8;
const MIN_FIT = 0.6;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const cameraDistance = (heightPx: number) =>
  heightPx / PX / 2 / Math.tan((FOV * Math.PI) / 360);

/** As medidas da lombada de verdade (as mesmas da BookSpine), em unidades. */
export const landingDimensions = (book: BookVisual) =>
  bookDimensionsForSpine(
    spineHeight(book.id) / PX,
    spineWidth(book.pageCount) / PX,
  );

/** Aleatório repetível por livro: a mesma flutuação a cada visita. */
function seeded(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const overlaps = (a: LandingBlock, b: LandingBlock) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * Onde o livro flutua sem a história: na altura da vaga, se não cobrir o
 * texto; senão, acima ou abaixo dele (o lado da vaga), encolhido até caber.
 */
function floatPlacement(
  slot: LandingSlot,
  dims: BookDimensions,
  stage: Stage,
  startScale: number,
  avoid: LandingBlock[],
) {
  const pad = FLOAT_PX + FLOAT_MARGIN;
  const height = dims.height * PX * startScale;
  const x = slot.x * stage.width;
  const halfWidth = (dims.width * PX * startScale) / 2 + pad;
  const inside = (y: number, top: number, bottom: number, fit: number) => {
    const half = (height * fit) / 2 + pad;
    return clamp(y, top + half, Math.max(top + half, bottom - half));
  };
  let top = 0;
  let bottom = stage.height;
  const y = inside(slot.y * stage.height, top, bottom, 1);
  const half = height / 2 + pad;
  const box = {
    left: x - halfWidth,
    right: x + halfWidth,
    top: y - half,
    bottom: y + half,
  };
  if (avoid.some((block) => overlaps(box, block))) {
    const textTop = Math.min(...avoid.map((block) => block.top));
    const textBottom = Math.max(...avoid.map((block) => block.bottom));
    if (slot.y * stage.height < (textTop + textBottom) / 2) bottom = textTop;
    else top = textBottom;
  }
  const fit = Math.min(1, (bottom - top - 2 * pad) / height);
  if (fit < MIN_FIT) return null;
  return {
    y: inside(slot.y * stage.height, top, bottom, fit),
    scale: startScale * fit,
  };
}

export type Wave = { speed: number; phase: number };

export type LandingStart = {
  /** O centro do livro no palco, em px. */
  x: number;
  y: number;
  /** O tamanho na tela, sobre o da lombada no plano z = 0 (perto é maior). */
  scale: number;
  /** O giro de partida (ordem YXZ), em radianos, nos eixos do three. */
  pitch: number;
  yaw: number;
  roll: number;
  /** Cinco ondas sem relação entre si: x, y, e os três giros. */
  waves: [Wave, Wave, Wave, Wave, Wave];
};

/**
 * A partida de cada livro: a vaga, o tamanho pela profundidade e um giro de
 * 3/4, nunca de perfil (um pouco da lombada ou da borda das folhas, e às
 * vezes do alto). Sem a história (`floating`), fica fora do texto; sem lugar,
 * fica de fora (null).
 */
export function landingStart(
  book: BookVisual,
  slot: LandingSlot,
  floating: boolean,
  avoid: LandingBlock[] | null,
  dims: BookDimensions,
  stage: Stage,
  wide: boolean,
): LandingStart | null {
  let scale =
    slot.depth *
    (wide
      ? WIDE_SCALE * clamp(stage.width / FULL_WIDTH, 0.6, 1)
      : NARROW_SCALE);
  let y = slot.y * stage.height;
  if (floating) {
    const placement = floatPlacement(slot, dims, stage, scale, avoid ?? []);
    if (!placement) return null;
    y = placement.y;
    scale = placement.scale;
  }
  const random = seeded(hashString(book.id));
  const side = random() < 0.5 ? -1 : 1;
  const pitch = -0.08 + random() * 0.22;
  const yaw = side * (0.34 + random() * 0.3);
  const roll = (random() - 0.5) * 0.2;
  const waves = Array.from({ length: 5 }, () => ({
    speed: 0.35 + random() * 0.45,
    phase: random() * Math.PI * 2,
  })) as LandingStart["waves"];
  return { x: slot.x * stage.width, y, scale, pitch, yaw, roll, waves };
}

/** Uma onda suave: dois senos com razão irracional, que nunca se repetem juntos. */
export const wave = (time: number, { speed, phase }: Wave) =>
  Math.sin(time * speed + phase) * 0.7 +
  Math.sin(time * speed * 2.17 + phase * 1.3) * 0.3;

let origin: number | null = null;

/**
 * O relógio da flutuação, em segundos, o mesmo para as capas que seguram o
 * lugar e para a cena 3D: ela começa na onda em que as capas estão.
 */
export function landingTime() {
  origin ??= performance.now();
  return (performance.now() - origin) / 1000;
}
