type FontVariable =
  "--font-instrument-serif" | "--font-geist-sans" | "--font-geist-mono";

const FALLBACK: Record<FontVariable, string> = {
  "--font-instrument-serif": "serif",
  "--font-geist-sans": "sans-serif",
  "--font-geist-mono": "monospace",
};

const ELLIPSIS = "…";

/**
 * A pilha de fontes de uma variável do next/font, para o canvas desenhar com
 * as mesmas fontes da interface (o nome real da família muda a cada build).
 */
export function fontStack(variable: FontVariable): string {
  const stack = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim();
  return stack || FALLBACK[variable];
}

/** Espera as fontes que o canvas usa: o texto desenhado não troca de fonte depois. */
export async function loadCanvasFonts() {
  const serif = fontStack("--font-instrument-serif");
  const sans = fontStack("--font-geist-sans");
  const mono = fontStack("--font-geist-mono");
  await Promise.all([
    document.fonts.load(`48px ${serif}`),
    document.fonts.load(`italic 48px ${serif}`),
    document.fonts.load(`24px ${sans}`),
    document.fonts.load(`24px ${mono}`),
  ]).catch(() => undefined);
}

function fits(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  return ctx.measureText(text).width <= maxWidth;
}

// Palavra maior que a linha (um título de uma palavra só, um link): quebra
// por caracteres, como o overflow-wrap do CSS
function breakWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  maxWidth: number,
) {
  const pieces: string[] = [];
  let piece = "";
  for (const char of word) {
    if (piece && !fits(ctx, piece + char, maxWidth)) {
      pieces.push(piece);
      piece = char;
    } else {
      piece += char;
    }
  }
  if (piece) pieces.push(piece);
  return pieces;
}

function greedy(
  ctx: CanvasRenderingContext2D,
  words: string[],
  maxWidth: number,
) {
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (fits(ctx, candidate, maxWidth)) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (fits(ctx, word, maxWidth)) {
      line = word;
      continue;
    }
    const pieces = breakWord(ctx, word, maxWidth);
    lines.push(...pieces.slice(0, -1));
    line = pieces.at(-1) ?? "";
  }
  if (line) lines.push(line);
  return lines;
}

function withEllipsis(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  let kept = text.trimEnd();
  while (kept && !fits(ctx, `${kept}${ELLIPSIS}`, maxWidth)) {
    kept = kept.slice(0, -1).trimEnd();
  }
  return `${kept}${ELLIPSIS}`;
}

/**
 * Quebra o texto em linhas com a fonte atual do contexto. Passou de
 * `maxLines`, a última linha termina em "…", como o line-clamp. Com
 * `balance`, as linhas ficam do mesmo tamanho, como o text-wrap: balance.
 */
export function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
  { balance = false }: { balance?: boolean } = {},
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || maxLines < 1) return [];

  const lines = greedy(ctx, words, maxWidth);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = withEllipsis(
      ctx,
      `${lines[maxLines - 1]} ${lines[maxLines]}`,
      maxWidth,
    );
    return kept;
  }
  if (!balance || lines.length < 2) return lines;

  // A menor largura que mantém o mesmo número de linhas
  let low = 0;
  let high = maxWidth;
  for (let step = 0; step < 14; step++) {
    const middle = (low + high) / 2;
    if (greedy(ctx, words, middle).length > lines.length) low = middle;
    else high = middle;
  }
  return greedy(ctx, words, high);
}

/** Desenha as linhas a partir de `top`, cada uma centrada na sua altura de linha. */
export function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  top: number,
  lineHeight: number,
) {
  ctx.textBaseline = "middle";
  lines.forEach((line, index) => {
    ctx.fillText(line, x, top + lineHeight * (index + 0.5));
  });
}
