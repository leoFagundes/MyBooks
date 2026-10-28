// CSV do jeito da RFC 4180: campo com vírgula, aspas ou quebra de linha vai
// entre aspas, e aspas dentro dele dobram. É o formato do Goodreads.

function csvField(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Linhas em CSV, com a primeira sendo o cabeçalho. */
export function toCsv(rows: (string | number | null)[][]): string {
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n");
}
