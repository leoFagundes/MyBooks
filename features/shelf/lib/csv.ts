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

/**
 * Lê um CSV inteiro: aspas, aspas dobradas, vírgula e quebra de linha dentro
 * do campo, CRLF ou LF, e o BOM do começo. Linhas em branco somem.
 */
export function parseCsv(text: string): string[][] {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char !== '"') field += char;
      else if (source[index + 1] === '"') {
        field += '"';
        index++;
      } else quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((line) => line.some((cell) => cell.trim() !== ""));
}
