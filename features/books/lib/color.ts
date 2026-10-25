import { hashString } from "./hash";

function channels(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  const number = Number.parseInt(full, 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

function linear(channel: number) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function toChannel(linearValue: number) {
  const c =
    linearValue <= 0.0031308
      ? linearValue * 12.92
      : 1.055 * linearValue ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
}

function toHex(rgb: readonly number[]) {
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Luminância relativa da WCAG, de 0 (preto) a 1 (branco). */
export function relativeLuminance(hex: string) {
  const [r, g, b] = channels(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string) {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (light + 0.05) / (dark + 0.05);
}

// As tintas do texto sobre as capas, iguais a --ink e --paper do globals.css
// (tests/design-rules confere). Em RGB, porque o código não leva hex solto.
export const INK_RGB = [17, 17, 16] as const;
export const PAPER_RGB = [237, 237, 234] as const;
const INK_LUMINANCE = relativeLuminance(toHex(INK_RGB));
const PAPER_LUMINANCE = relativeLuminance(toHex(PAPER_RGB));
const AA = 4.5;

const onInk = (luminance: number) =>
  (luminance + 0.05) / (INK_LUMINANCE + 0.05);
const onPaper = (luminance: number) =>
  (PAPER_LUMINANCE + 0.05) / (luminance + 0.05);

/** Tinta com mais contraste sobre a cor: --ink (escura) ou --paper (clara). */
export function pickInk(background: string): "ink" | "paper" {
  const luminance = relativeLuminance(background);
  return onInk(luminance) >= onPaper(luminance) ? "ink" : "paper";
}

/**
 * Fundo e tinta para texto sobre a cor do livro (lombada, capa tipográfica),
 * sempre com contraste AA. Algumas cores de capa ficam no meio-termo em que
 * nem --ink nem --paper chegam a 4,5:1; aí o fundo escurece ou clareia o
 * mínimo, mantendo o matiz.
 */
export function coverInk(color: string): {
  background: string;
  ink: "ink" | "paper";
} {
  const luminance = relativeLuminance(color);
  if (Math.max(onInk(luminance), onPaper(luminance)) >= AA) {
    return { background: color, ink: pickInk(color) };
  }

  const darkTarget = (PAPER_LUMINANCE + 0.05) / AA - 0.05;
  const lightTarget = AA * (INK_LUMINANCE + 0.05) - 0.05;
  const darken = luminance - darkTarget <= lightTarget - luminance;
  const rgb = channels(color).map(linear);
  let target = darken ? darkTarget : lightTarget;
  let background = color;

  // Arredondar para 8 bits pode tirar uma lasca do contraste: se tirar,
  // empurra o alvo um pouco mais e tenta de novo
  for (let attempt = 0; attempt < 20; attempt++) {
    // A luminância é linear no RGB linear: escalar escurece sem mudar o matiz;
    // misturar com branco clareia
    const adjusted = darken
      ? rgb.map((c) => c * (target / luminance))
      : rgb.map((c) => c + ((target - luminance) / (1 - luminance)) * (1 - c));
    background = toHex(adjusted.map(toChannel));
    const result = relativeLuminance(background);
    if ((darken ? onPaper(result) : onInk(result)) >= AA) break;
    target += darken ? -0.002 : 0.002;
  }
  return { background, ink: darken ? "paper" : "ink" };
}

export function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const h = (((hue % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((h % 2) - 1));
  const [r, g, b] =
    h < 1
      ? [chroma, x, 0]
      : h < 2
        ? [x, chroma, 0]
        : h < 3
          ? [0, chroma, x]
          : h < 4
            ? [0, x, chroma]
            : h < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const m = l - chroma / 2;
  return `#${[r, g, b]
    .map((v) =>
      Math.round((v + m) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

// Com 32% de luminosidade, todo matiz (até o amarelo, o mais claro) fica com
// contraste ≥ 4,5 contra a tinta clara; com 38% o amarelo-esverdeado não fica.
const GENERATED_SATURATION = 32;
const GENERATED_LIGHTNESS = 32;

/** Cor sólida e sóbria para a capa tipográfica, derivada do título (spec §4). */
export function generatedCoverColor(title: string) {
  return hslToHex(
    hashString(title) % 360,
    GENERATED_SATURATION,
    GENERATED_LIGHTNESS,
  );
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * Cor do livro: a da capa, ou a gerada pelo título quando não há capa. Ela
 * vai para o style (--cover), então só passa um hex de 6 dígitos.
 */
export function bookColor(book: { title: string; coverColor: string | null }) {
  return book.coverColor && HEX_COLOR.test(book.coverColor)
    ? book.coverColor
    : generatedCoverColor(book.title);
}
