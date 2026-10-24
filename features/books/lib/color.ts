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

/** Tinta do texto sobre uma cor de capa: escura em fundo claro, clara em fundo escuro. */
export function pickInk(background: string): "ink" | "paper" {
  return relativeLuminance(background) > 0.179 ? "ink" : "paper";
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

/** Cor do livro: a da capa, ou a gerada pelo título quando não há capa. */
export function bookColor(book: { title: string; coverColor: string | null }) {
  return book.coverColor ?? generatedCoverColor(book.title);
}
