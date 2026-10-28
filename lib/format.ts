export const NUMBER_LOCALE = "pt-BR";

const numberFormat = new Intl.NumberFormat(NUMBER_LOCALE);

/** 1204 → "1.204", igual ao que o NumberFlow desenha. */
export function formatNumber(value: number) {
  return numberFormat.format(value);
}

const dayFormat = new Intl.DateTimeFormat(NUMBER_LOCALE, {
  day: "numeric",
  month: "short",
});
const dayYearFormat = new Intl.DateTimeFormat(NUMBER_LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias", "12 de out." */
export function formatRelativeTime(iso: string, now: number) {
  const time = new Date(iso).getTime();
  const minutes = Math.floor((now - time) / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  const date = new Date(time);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return (sameYear ? dayFormat : dayYearFormat).format(date);
}
