export const NUMBER_LOCALE = "pt-BR";

const numberFormat = new Intl.NumberFormat(NUMBER_LOCALE);

/** 1204 → "1.204", igual ao que o NumberFlow desenha. */
export function formatNumber(value: number) {
  return numberFormat.format(value);
}
