import {
  bookColor,
  coverInk,
  INK_RGB,
  PAPER_RGB,
  toHex,
} from "@/features/books/lib/color";
import { hashString } from "@/features/books/lib/hash";
import type { CommunityQuote } from "@/features/books/queries";
import type { BookVisual } from "@/features/books/types";
import { drawLines, fontStack, wrapLines } from "./canvas-text";
import type { BookDimensions } from "./dimensions";

// As faces desenhadas têm os 2:3 da capa. Com 768px de largura, ficam nítidas
// na capa grande de uma tela 2x
const ART_WIDTH = 768;
const ART_HEIGHT = 1152;
const SPINE_HEIGHT = 1152;

const INK = toHex(INK_RGB);
const PAPER = toHex(PAPER_RGB);

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível");
  return { canvas, ctx };
}

/** Fundo e tinta sobre a cor do livro, com o contraste AA do coverInk. */
function palette(book: BookVisual) {
  const { background, ink } = coverInk(bookColor(book));
  return { background, ink: ink === "ink" ? INK : PAPER };
}

function setFont(
  ctx: CanvasRenderingContext2D,
  font: string,
  size: number,
  tracking = 0,
  style: "normal" | "italic" = "normal",
) {
  ctx.font = `${style} 400 ${size}px ${font}`;
  ctx.letterSpacing = `${tracking * size}px`;
}

/**
 * A capa tipográfica, igual à do BookCover: título em serif com 13% da
 * largura, autoria em mono com 6,5%, margem de 10% e a tinta do coverInk.
 */
export function drawGeneratedCover(book: BookVisual) {
  const { canvas, ctx } = createCanvas(ART_WIDTH, ART_HEIGHT);
  const { background, ink } = palette(book);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);
  ctx.fillStyle = ink;

  const pad = ART_WIDTH * 0.1;
  const inner = ART_WIDTH - 2 * pad;

  const titleSize = ART_WIDTH * 0.13;
  setFont(ctx, fontStack("--font-instrument-serif"), titleSize, -0.025);
  const title = wrapLines(ctx, book.title, inner, 5, { balance: true });
  drawLines(ctx, title, pad, pad, titleSize * 1.05);

  const authorSize = ART_WIDTH * 0.065;
  const authorLine = authorSize * 1.375;
  setFont(ctx, fontStack("--font-geist-mono"), authorSize, 0.05);
  const author = wrapLines(
    ctx,
    book.authors.join(", ").toUpperCase(),
    inner,
    2,
  );
  drawLines(
    ctx,
    author,
    pad,
    ART_HEIGHT - pad - author.length * authorLine,
    authorLine,
  );
  return canvas;
}

/**
 * A contracapa: o catálogo não tem a imagem dela, então ela é desenhada na
 * cor do livro, com o título, a sinopse e a autoria, como num livro de verdade.
 */
export function drawBackCover(book: BookVisual, description: string | null) {
  const { canvas, ctx } = createCanvas(ART_WIDTH, ART_HEIGHT);
  const { background, ink } = palette(book);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, ART_WIDTH, ART_HEIGHT);
  ctx.fillStyle = ink;

  const pad = ART_WIDTH * 0.1;
  const inner = ART_WIDTH - 2 * pad;

  const titleSize = ART_WIDTH * 0.075;
  const titleLine = titleSize * 1.08;
  setFont(ctx, fontStack("--font-instrument-serif"), titleSize, -0.02);
  const title = wrapLines(ctx, book.title, inner, 3, { balance: true });
  drawLines(ctx, title, pad, pad, titleLine);

  const authorSize = ART_WIDTH * 0.026;
  const authorLine = authorSize * 1.5;
  setFont(ctx, fontStack("--font-geist-mono"), authorSize, 0.08);
  const author = wrapLines(
    ctx,
    book.authors.join(", ").toUpperCase(),
    inner,
    2,
  );
  const authorTop = ART_HEIGHT - pad - author.length * authorLine;
  drawLines(ctx, author, pad, authorTop, authorLine);

  if (description) {
    const bodySize = ART_WIDTH * 0.034;
    const bodyLine = bodySize * 1.6;
    const top = pad + title.length * titleLine + ART_WIDTH * 0.06;
    const room = authorTop - ART_WIDTH * 0.06 - top;
    setFont(ctx, fontStack("--font-geist-sans"), bodySize);
    const body = wrapLines(
      ctx,
      description,
      inner,
      Math.max(0, Math.floor(room / bodyLine)),
    );
    drawLines(ctx, body, pad, top, bodyLine);
  }
  return canvas;
}

/**
 * A lombada, como o BookSpine: título em serif descendo de cima para baixo
 * (a ABNT pede assim) e autoria em mono no pé, se a espessura deixar.
 */
export function drawSpine(book: BookVisual, dims: BookDimensions) {
  const width = Math.max(
    32,
    Math.round((SPINE_HEIGHT * dims.pagesDepth) / dims.height),
  );
  const { canvas, ctx } = createCanvas(width, SPINE_HEIGHT);
  const { background, ink } = palette(book);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, SPINE_HEIGHT);
  ctx.fillStyle = ink;

  // Girado 90°: o x do texto desce pela lombada, e o topo das letras olha
  // para a capa
  ctx.translate(width / 2, 0);
  ctx.rotate(Math.PI / 2);
  ctx.textBaseline = "middle";
  const margin = SPINE_HEIGHT * 0.06;
  let room = SPINE_HEIGHT - 2 * margin;

  const author = book.authors[0] ?? "";
  if (author && width >= 48) {
    const authorSize = Math.min(width * 0.22, 20);
    setFont(ctx, fontStack("--font-geist-mono"), authorSize, 0.05);
    const [line] = wrapLines(ctx, author.toUpperCase(), room * 0.3, 1);
    if (line) {
      ctx.textAlign = "right";
      ctx.fillText(line, SPINE_HEIGHT - margin, 0);
      room -= ctx.measureText(line).width + SPINE_HEIGHT * 0.04;
    }
  }

  const titleSize = Math.min(width * 0.46, 56);
  setFont(ctx, fontStack("--font-instrument-serif"), titleSize, -0.01);
  const [title] = wrapLines(ctx, book.title, room, 1);
  ctx.textAlign = "left";
  if (title) ctx.fillText(title, margin, 0);
  return canvas;
}

/**
 * Bordas das folhas: papel com uma linha fina por folha, de tom e espaço
 * variados, sempre os mesmos para o mesmo livro. Em `vertical`, as linhas
 * descem (a frente do miolo); senão, atravessam (em cima e embaixo).
 */
export function drawPageEdges(seed: string, vertical = false) {
  const size = 256;
  const { canvas, ctx } = createCanvas(size, size);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = INK;

  let state = hashString(seed) || 1;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  for (let position = 0; position < size;) {
    ctx.globalAlpha = 0.04 + random() * 0.07;
    if (vertical) ctx.fillRect(position, 0, 1, size);
    else ctx.fillRect(0, position, size, 1);
    position += 2 + random() * 2.5;
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/**
 * A folha de rosto (spec §5.7): tinta sobre papel, com o título e a autoria
 * centrados no alto, a sinopse no meio e uma citação da comunidade no pé,
 * com o @ e a página. Sem sinopse ou sem citação, o resto se acomoda.
 * `aspect` é a largura sobre a altura da frente do miolo.
 */
export function drawTitlePage(
  book: BookVisual,
  description: string | null,
  quote: CommunityQuote | null,
  aspect: number,
) {
  const width = ART_WIDTH;
  const height = Math.round(width / aspect);
  const { canvas, ctx } = createCanvas(width, height);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = INK;

  const serif = fontStack("--font-instrument-serif");
  const mono = fontStack("--font-geist-mono");
  const padX = width * 0.11;
  const inner = width - 2 * padX;
  const center = width / 2;
  let top = height * 0.1;

  ctx.textAlign = "center";
  const titleSize = width * 0.085;
  const titleLine = titleSize * 1.06;
  setFont(ctx, serif, titleSize, -0.02);
  const title = wrapLines(ctx, book.title, inner, 3, { balance: true });
  drawLines(ctx, title, center, top, titleLine);
  top += title.length * titleLine + height * 0.025;

  const authorSize = width * 0.026;
  const authorLine = authorSize * 1.5;
  setFont(ctx, mono, authorSize, 0.12);
  const author = wrapLines(
    ctx,
    book.authors.join(", ").toUpperCase(),
    inner,
    2,
  );
  drawLines(ctx, author, center, top, authorLine);
  top += author.length * authorLine + height * 0.04;

  ctx.fillRect(center - width * 0.05, top, width * 0.1, 2);
  top += height * 0.045;

  // A citação se arruma de baixo para cima; a sinopse fica com o que sobrar
  let bottom = height * 0.92;
  if (quote) {
    const creditSize = width * 0.022;
    const creditLine = creditSize * 1.5;
    setFont(ctx, mono, creditSize, 0.06);
    const credit = `— @${quote.reader.username}${quote.page ? ` · p. ${quote.page}` : ""}`;
    bottom -= creditLine;
    drawLines(ctx, [credit], center, bottom, creditLine);
    bottom -= height * 0.015;

    const quoteSize = width * 0.04;
    const quoteLine = quoteSize * 1.32;
    setFont(ctx, serif, quoteSize, 0, "italic");
    const lines = wrapLines(ctx, `“${quote.text}”`, inner, 6, {
      balance: true,
    });
    bottom -= lines.length * quoteLine;
    drawLines(ctx, lines, center, bottom, quoteLine);
    bottom -= height * 0.05;
  }

  if (description) {
    ctx.textAlign = "left";
    const bodySize = width * 0.031;
    const bodyLine = bodySize * 1.6;
    setFont(ctx, fontStack("--font-geist-sans"), bodySize);
    const room = Math.min(9, Math.floor((bottom - top) / bodyLine));
    drawLines(
      ctx,
      wrapLines(ctx, description, inner, Math.max(0, room)),
      padX,
      top,
      bodyLine,
    );
  }
  return canvas;
}

/**
 * Uma página de citação, para as folhas que se viram depois da folha de
 * rosto: a citação em itálico no meio da página e o crédito embaixo.
 */
export function drawQuotePage(quote: CommunityQuote | null, aspect: number) {
  const width = ART_WIDTH;
  const height = Math.round(width / aspect);
  const { canvas, ctx } = createCanvas(width, height);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  if (!quote) return canvas;
  ctx.fillStyle = INK;

  const serif = fontStack("--font-instrument-serif");
  const mono = fontStack("--font-geist-mono");
  const inner = width * 0.74;
  const center = width / 2;
  ctx.textAlign = "center";

  const captionSize = width * 0.022;
  setFont(ctx, mono, captionSize, 0.14);
  drawLines(ctx, ["DA COMUNIDADE"], center, height * 0.1, captionSize * 1.5);

  const quoteSize = width * 0.05;
  const quoteLine = quoteSize * 1.3;
  setFont(ctx, serif, quoteSize, 0, "italic");
  const lines = wrapLines(ctx, `“${quote.text}”`, inner, 12, {
    balance: true,
  });
  const creditSize = width * 0.024;
  const creditLine = creditSize * 1.5;
  const block = lines.length * quoteLine + height * 0.03 + creditLine;
  const top = (height - block) / 2;
  drawLines(ctx, lines, center, top, quoteLine);

  setFont(ctx, mono, creditSize, 0.06);
  const credit = `— @${quote.reader.username}${quote.page ? ` · p. ${quote.page}` : ""}`;
  drawLines(
    ctx,
    [credit],
    center,
    top + lines.length * quoteLine + height * 0.03,
    creditLine,
  );
  return canvas;
}
