/**
 * Estilos da capa tipográfica (a capa de quem não tem imagem). O banco
 * espelha a lista no check books_cover_style_valid; null lá é a Clássica.
 */
export const COVER_STYLES = ["classic", "framed", "band", "minimal"] as const;

export type CoverStyle = (typeof COVER_STYLES)[number];

export const COVER_STYLE_LABEL: Record<CoverStyle, string> = {
  classic: "Clássica",
  framed: "Moldura",
  band: "Faixa",
  minimal: "Mínima",
};

/** O estilo guardado, ou a Clássica para o que não for um dos quatro. */
export function coverStyleOf(value: string | null | undefined): CoverStyle {
  return COVER_STYLES.find((style) => style === value) ?? "classic";
}

/**
 * Onde a faixa de papel do estilo Faixa começa e termina, em frações da
 * altura: na capa e na lombada, em CSS e no canvas do 3D.
 */
export const BAND = { top: 0.36, bottom: 0.68 } as const;
