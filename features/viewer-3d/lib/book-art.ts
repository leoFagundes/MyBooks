import {
  bookColor,
  coverInk,
  INK_RGB,
  PAPER_RGB,
  toHex,
} from "@/features/books/lib/color";
import { BAND } from "@/features/books/lib/cover-style";
import { hashString } from "@/features/books/lib/hash";
import type { CommunityQuote } from "@/features/books/queries";
import type { BookVisual } from "@/features/books/types";
import { drawLines, fontStack, wrapLines } from "./canvas-text";
import type { BookDimensions } from "./dimensions";

// As faces desenhadas têm os 2:3 da capa. Com 1024px de largura, ficam
// nítidas na capa grande de uma tela 2x, mesmo com o zoom
const ART_WIDTH = 1024;
const ART_HEIGHT = 1536;
const SPINE_HEIGHT = 1536;
// A contracapa leva a sinopse curta, como a de uma orelha
const SYNOPSIS_CHARS = 320;

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

/** Medidas em frações da largura da capa, como os cqi do GeneratedCover. */
const units = (width: number) => (value: number) => (width * value) / 100;

type CoverText = {
  ctx: CanvasRenderingContext2D;
  title: string;
  /** A autoria já em caixa alta, separada por vírgulas. */
  authors: string;
  /** Largura e altura da arte. */
  w: number;
  h: number;
};

/** Clássica: título no alto, autoria no pé, alinhados à esquerda. */
function drawClassicCover({ ctx, title, authors, w, h }: CoverText) {
  const cqi = units(w);
  const pad = cqi(10);
  const inner = w - 2 * pad;
  const titleSize = cqi(13);
  setFont(ctx, fontStack("--font-instrument-serif"), titleSize, -0.025);
  drawLines(
    ctx,
    wrapLines(ctx, title, inner, 5, { balance: true }),
    pad,
    pad,
    titleSize * 1.05,
  );

  const authorSize = cqi(6.5);
  const authorLine = authorSize * 1.375;
  setFont(ctx, fontStack("--font-geist-mono"), authorSize, 0.05);
  const author = wrapLines(ctx, authors, inner, 2);
  drawLines(ctx, author, pad, h - pad - author.length * authorLine, authorLine);
}

/** Moldura: um fio em volta, e título, traço e autoria centrados. */
function drawFramedCover({ ctx, title, authors, w, h }: CoverText) {
  const cqi = units(w);
  const inset = cqi(7);
  const border = Math.max(2, cqi(0.9));
  ctx.lineWidth = border;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.strokeRect(
    inset + border / 2,
    inset + border / 2,
    w - 2 * inset - border,
    h - 2 * inset - border,
  );

  const inner = w - 2 * inset - 2 * border - 2 * cqi(7);
  const gap = cqi(5);
  const rule = Math.max(2, cqi(0.6));
  const titleSize = cqi(12);
  const titleLine = titleSize * 1.05;
  setFont(ctx, fontStack("--font-instrument-serif"), titleSize, -0.025);
  const titleLines = wrapLines(ctx, title, inner, 4, { balance: true });
  const authorSize = cqi(5.5);
  const authorLine = authorSize * 1.375;
  setFont(ctx, fontStack("--font-geist-mono"), authorSize, 0.05);
  const authorLines = wrapLines(ctx, authors, inner, 2);

  const height =
    titleLines.length * titleLine +
    gap +
    rule +
    (authorLines.length > 0 ? gap + authorLines.length * authorLine : 0);
  const center = w / 2;
  let top = (h - height) / 2;
  ctx.textAlign = "center";
  setFont(ctx, fontStack("--font-instrument-serif"), titleSize, -0.025);
  drawLines(ctx, titleLines, center, top, titleLine);
  top += titleLines.length * titleLine + gap;
  ctx.fillRect(center - cqi(8), top, cqi(16), rule);
  top += rule + gap;
  setFont(ctx, fontStack("--font-geist-mono"), authorSize, 0.05);
  drawLines(ctx, authorLines, center, top, authorLine);
  ctx.textAlign = "left";
}

/** Faixa: o título numa faixa de papel no meio, a autoria embaixo. */
function drawBandCover({ ctx, title, authors, w, h }: CoverText) {
  const cqi = units(w);
  const ink = ctx.fillStyle;
  const bandTop = h * BAND.top;
  const bandHeight = h * (BAND.bottom - BAND.top);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, bandTop, w, bandHeight);

  const inner = w - 2 * cqi(9);
  const center = w / 2;
  ctx.textAlign = "center";
  const titleSize = cqi(11);
  const titleLine = titleSize * 1.05;
  setFont(ctx, fontStack("--font-instrument-serif"), titleSize, -0.025);
  const titleLines = wrapLines(ctx, title, inner, 3, { balance: true });
  // Na faixa de papel, a tinta escura sempre passa no contraste
  ctx.fillStyle = INK;
  drawLines(
    ctx,
    titleLines,
    center,
    bandTop + (bandHeight - titleLines.length * titleLine) / 2,
    titleLine,
  );

  const authorSize = cqi(5.5);
  const authorLine = authorSize * 1.375;
  setFont(ctx, fontStack("--font-geist-mono"), authorSize, 0.05);
  const author = wrapLines(ctx, authors, inner, 2);
  ctx.fillStyle = ink;
  drawLines(
    ctx,
    author,
    center,
    h - cqi(9) - author.length * authorLine,
    authorLine,
  );
  ctx.textAlign = "left";
}

/** Mínima: a autoria no alto e o título grande no pé. */
function drawMinimalCover({ ctx, title, authors, w, h }: CoverText) {
  const cqi = units(w);
  const pad = cqi(10);
  const inner = w - 2 * pad;
  const authorSize = cqi(5.5);
  setFont(ctx, fontStack("--font-geist-mono"), authorSize, 0.05);
  drawLines(
    ctx,
    wrapLines(ctx, authors, inner, 2),
    pad,
    pad,
    authorSize * 1.375,
  );

  const titleSize = cqi(15);
  setFont(ctx, fontStack("--font-instrument-serif"), titleSize, -0.025);
  const lines = wrapLines(ctx, title, inner, 4, { balance: true });
  drawLines(ctx, lines, pad, h - pad - lines.length * titleSize, titleSize);
}

/**
 * A capa tipográfica, igual à do BookCover (GeneratedCover), no estilo do
 * livro: as mesmas frações da largura, a mesma margem e a tinta do coverInk.
 * `width` menor serve à landing, que tem muitos livros e todos pequenos.
 */
export function drawGeneratedCover(book: BookVisual, width = ART_WIDTH) {
  const height = Math.round(width * 1.5);
  const { canvas, ctx } = createCanvas(width, height);
  const { background, ink } = palette(book);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = ink;
  const text = {
    ctx,
    title: book.title,
    authors: book.authors.join(", ").toUpperCase(),
    w: width,
    h: height,
  };
  if (book.coverStyle === "framed") drawFramedCover(text);
  else if (book.coverStyle === "band") drawBandCover(text);
  else if (book.coverStyle === "minimal") drawMinimalCover(text);
  else drawClassicCover(text);
  return canvas;
}

/** A sinopse curta, cortada na palavra, com reticências se passar. */
export function shortSynopsis(description: string, max = SYNOPSIS_CHARS) {
  const text = description.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  const kept = space > max * 0.6 ? cut.slice(0, space) : cut;
  // Sem pontuação solta antes das reticências
  return `${kept.replace(/[\s,;:.–—-]+$/, "")}…`;
}

/**
 * A contracapa: o catálogo não tem a imagem dela, então ela é desenhada na
 * cor do livro, com o título, a sinopse curta e a autoria, como num livro de
 * verdade.
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
      shortSynopsis(description),
      inner,
      Math.max(0, Math.floor(room / bodyLine)),
    );
    drawLines(ctx, body, pad, top, bodyLine);
  }
  return canvas;
}

/** A lombada da página (BookSpine), em px: a 3D da landing cai em cima dela. */
export type ShelfSpine = { width: number; height: number };

/**
 * A lombada, como o BookSpine (SpineArt): título em serif descendo de cima
 * para baixo (a ABNT pede assim) e autoria em mono no pé, se a espessura
 * deixar, no estilo da capa: a Moldura ganha dois fios, a Faixa continua a
 * tira de papel da capa (na mesma altura, com o texto por cima dela na tinta
 * escura) e a Mínima fica só com o título, no meio. Com `shelf`
 * (a landing), as medidas são as da SpineArt na lombada da página, para a
 * troca de uma pela outra não mexer no texto.
 */
export function drawSpine(
  book: BookVisual,
  dims: BookDimensions,
  spineHeight = SPINE_HEIGHT,
  shelf?: ShelfSpine,
) {
  const H = spineHeight;
  // A face da lombada cobre o miolo e as duas folgas
  const width = Math.max(
    Math.round(H / 36),
    Math.round((H * (dims.pagesDepth + 2 * dims.gap)) / dims.height),
  );
  // Os tetos das letras foram medidos na lombada de 1152px
  const k = H / 1152;
  // Na landing, um px da lombada da página vale u px do canvas
  const u = shelf ? H / shelf.height : 0;
  const { canvas, ctx } = createCanvas(width, H);
  const { background, ink } = palette(book);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, H);
  ctx.fillStyle = ink;

  const style = book.coverStyle;
  if (style === "framed") {
    // Na página, fios de 1px a 6px das pontas e a 3px dos lados
    const bar = shelf ? u : Math.max(2, H * 0.003);
    const end = shelf ? 6 * u : H * 0.03;
    const side = shelf ? 3 * u : width * 0.12;
    for (const top of [end, H - end - bar]) {
      ctx.fillRect(side, top, width - 2 * side, bar);
    }
  }
  // A tira da Faixa na mesma altura da capa: quem olha a quina vê a faixa
  // dar a volta no livro
  const band = { start: H * BAND.top, end: H * BAND.bottom };
  if (style === "band") {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, band.start, width, band.end - band.start);
  }

  // Girado 90°: o x do texto desce pela lombada, e o topo das letras olha
  // para a capa
  ctx.translate(width / 2, 0);
  ctx.rotate(Math.PI / 2);
  ctx.textBaseline = "middle";
  const margin = H * (style === "framed" ? 0.075 : 0.06);
  const titleSize = Math.min(width * 0.46, 56 * k);
  const author = (book.authors[0] ?? "").toUpperCase();
  const authorSize = Math.min(width * 0.22, 20 * k);
  const showAuthor = Boolean(author) && width >= 48 * k && style !== "minimal";

  const drawText = (fill: string) => {
    ctx.fillStyle = fill;
    if (shelf) {
      drawShelfSpineText(ctx, book, { H, u, wide: shelf.width >= 24 });
      return;
    }
    let room = H - 2 * margin;
    if (showAuthor) {
      setFont(ctx, fontStack("--font-geist-mono"), authorSize, 0.05);
      const [line] = wrapLines(ctx, author, room * 0.3, 1);
      if (line) {
        ctx.textAlign = "right";
        ctx.fillText(line, H - margin, 0);
        room -= ctx.measureText(line).width + H * 0.04;
      }
    }
    setFont(ctx, fontStack("--font-instrument-serif"), titleSize, -0.01);
    const [title] = wrapLines(ctx, book.title, room, 1);
    if (title && style === "minimal") {
      ctx.textAlign = "center";
      ctx.fillText(title, H / 2, 0);
    } else if (title) {
      ctx.textAlign = "left";
      ctx.fillText(title, margin, 0);
    }
  };

  drawText(ink);
  if (style === "band") {
    // O mesmo texto, recortado na tira, com a tinta que o papel pede
    ctx.save();
    ctx.beginPath();
    ctx.rect(band.start, -width / 2, band.end - band.start, width);
    ctx.clip();
    drawText(INK);
    ctx.restore();
  }
  return canvas;
}

/**
 * O texto da lombada nas medidas da SpineArt (em px da página, vezes u):
 * título de 13px e autoria de 8px, folga de 12px nas pontas (16px na
 * Moldura) e 6px entre os dois; o título vai primeiro e deixa ao menos 48px,
 * e a autoria fica com o resto (a Faixa também: a tira vem por cima). O
 * canvas já está girado, e a tinta já está escolhida.
 */
function drawShelfSpineText(
  ctx: CanvasRenderingContext2D,
  book: BookVisual,
  {
    H,
    u,
    wide,
  }: {
    H: number;
    u: number;
    /** Espessa o bastante para a autoria (24px na página). */
    wide: boolean;
  },
) {
  const serif = fontStack("--font-instrument-serif");
  const mono = fontStack("--font-geist-mono");
  const style = book.coverStyle;
  const author = wide ? (book.authors[0] ?? "").toUpperCase() : "";
  ctx.textAlign = "left";

  const pad = (style === "framed" ? 16 : 12) * u;
  const room = H - 2 * pad;
  setFont(ctx, serif, 13 * u);
  if (style === "minimal") {
    const [title] = wrapLines(ctx, book.title, room, 1);
    ctx.textAlign = "center";
    if (title) ctx.fillText(title, H / 2, 0);
    return;
  }
  const [title] = wrapLines(ctx, book.title, room - 48 * u, 1);
  if (title) ctx.fillText(title, pad, 0);
  const used = title ? ctx.measureText(title).width + 6 * u : 0;
  setFont(ctx, mono, 8 * u, 0.05);
  const [line] = wrapLines(ctx, author, room - used, 1);
  ctx.textAlign = "right";
  if (line) ctx.fillText(line, H - pad, 0);
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
