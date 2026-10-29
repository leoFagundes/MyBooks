import { toHex } from "./color";

/**
 * A paleta curada da capa tipográfica: tons de tecido de encadernação, todos
 * com contraste AA com a tinta sem ajuste (de 5,2:1 a 8,2:1) e pelo menos 2:1
 * contra o fundo dos dois temas, para a capa nunca sumir na página. Em RGB,
 * porque o código não leva hex solto.
 */
const SWATCHES = [
  { name: "Vinho", rgb: [140, 47, 42] },
  { name: "Terracota", rgb: [160, 72, 42] },
  { name: "Mostarda", rgb: [201, 154, 46] },
  { name: "Oliva", rgb: [95, 98, 48] },
  { name: "Floresta", rgb: [47, 93, 70] },
  { name: "Petróleo", rgb: [42, 107, 107] },
  { name: "Marinho", rgb: [36, 71, 107] },
  { name: "Cobalto", rgb: [58, 95, 168] },
  { name: "Índigo", rgb: [75, 63, 122] },
  { name: "Ameixa", rgb: [110, 53, 87] },
  { name: "Rosa antigo", rgb: [212, 154, 150] },
  { name: "Grafite", rgb: [80, 82, 80] },
] as const;

export const COVER_PALETTE = SWATCHES.map(({ name, rgb }) => ({
  name,
  hex: toHex(rgb),
}));

const HEX_COLOR = /^#[0-9a-f]{6}$/;

/**
 * O que a pessoa digitou no campo da cor (6 ou 3 dígitos, com ou sem a
 * cerquilha, em maiúsculas ou não) no hex de 6 dígitos minúsculo, ou null.
 */
export function normalizeHex(value: string): string | null {
  const raw = value.trim().replace(/^#/, "").toLowerCase();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;
  const hex = `#${full}`;
  return HEX_COLOR.test(hex) ? hex : null;
}
