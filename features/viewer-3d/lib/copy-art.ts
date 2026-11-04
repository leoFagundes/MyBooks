import { hashString } from "@/features/books/lib/hash";
import { ART_WIDTH, createCanvas, INK, PAPER, setFont } from "./book-art";
import { drawLines, fontStack, wrapLines } from "./canvas-text";
import type { Face } from "./pages";

// As páginas do exemplar de quem vê (o lápis, o marcador, as notas de margem,
// o ex-libris e o cartão da leitura), no mesmo papel e na mesma tinta das
// outras. O texto é o que os leitores guardaram, ou a primeira frase de um
// livro em domínio público: o MyBooks não mostra o texto de livro protegido.

/** Uma área tocável da página (as discussões), em frações da altura. */
export type PageLink = { top: number; bottom: number; topicId: string };

const serif = () => fontStack("--font-instrument-serif");
const mono = () => fontStack("--font-geist-mono");
const sans = () => fontStack("--font-geist-sans");

/** Um gerador de números de 0 a 1 que repete para a mesma semente. */
function seeded(seed: string) {
  let state = hashString(seed) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pageCanvas(aspect: number, canvas?: HTMLCanvasElement) {
  const width = ART_WIDTH;
  const height = Math.round(width / aspect);
  const target = canvas ?? createCanvas(width, height).canvas;
  const ctx = target.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível");
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 1;
  return { canvas: target, ctx, width, height };
}

function caption(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  top: number,
) {
  const size = width * 0.022;
  setFont(ctx, mono(), size, 0.14);
  ctx.textAlign = "center";
  drawLines(ctx, [text], width / 2, top, size * 1.5);
}

/** As iniciais num círculo de traço fino, como um carimbo pequeno de margem. */
function initialsBadge(
  ctx: CanvasRenderingContext2D,
  username: string,
  x: number,
  y: number,
  radius: number,
) {
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = radius * 0.08;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.7;
  setFont(ctx, mono(), radius * 0.85, 0);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(username.slice(0, 2).toUpperCase(), x, y + radius * 0.06);
  ctx.restore();
}

/** As notas de margem: quem mais guardou o mesmo trecho. */
function marginNotes(
  ctx: CanvasRenderingContext2D,
  people: string[],
  width: number,
  bottom: number,
) {
  if (people.length === 0) return;
  const radius = width * 0.026;
  const shown = people.slice(0, 3);
  const gapX = radius * 1.55;
  const start = width / 2 - ((shown.length - 1) * gapX) / 2;
  shown.forEach((username, index) =>
    initialsBadge(ctx, username, start + index * gapX, bottom - radius, radius),
  );
  const [first] = people;
  const text =
    people.length === 1
      ? `@${first} também marcou este trecho`
      : `@${first} e mais ${people.length - 1} também marcaram`;
  ctx.save();
  ctx.globalAlpha = 0.65;
  setFont(ctx, serif(), width * 0.03, 0, "italic");
  ctx.textAlign = "center";
  drawLines(ctx, [text], width / 2, bottom + radius * 0.6, width * 0.045);
  ctx.restore();
}

/**
 * Um traço de lápis de `x0` a `x1` na altura `y`, com o tremor de uma mão
 * (sempre o mesmo para a mesma semente), desenhado até `amount` (0 a 1).
 */
function pencilStroke(
  ctx: CanvasRenderingContext2D,
  x0: number,
  x1: number,
  y: number,
  amount: number,
  random: () => number,
  thickness: number,
) {
  if (amount <= 0) return;
  const steps = 18;
  const wobble = thickness * 0.9;
  const points = Array.from({ length: steps + 1 }, (_, index) => ({
    x: x0 + ((x1 - x0) * index) / steps,
    y: y + (random() - 0.5) * wobble + (index / steps) * thickness * 0.6,
  }));
  const last = Math.max(1, Math.round(steps * amount));
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0]?.x ?? x0, points[0]?.y ?? y);
  for (let index = 1; index <= last; index++) {
    const point = points[index];
    if (point) ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Uma citação. A de quem vê leva o sublinhado a lápis, que se desenha aos
 * poucos (`progress`, de 0 a 1), e o número da página anotado na margem; a da
 * comunidade, o crédito. As duas, as notas de quem mais marcou o trecho.
 */
export function drawQuoteFace(
  face: Extract<Face, { kind: "quote" }>,
  aspect: number,
  progress = 1,
  canvas?: HTMLCanvasElement,
) {
  const page = pageCanvas(aspect, canvas);
  const { ctx, width, height } = page;
  const mine = face.credit === null;
  caption(ctx, mine ? "SUA MARCAÇÃO" : "DA COMUNIDADE", width, height * 0.1);

  const size = width * 0.05;
  const lineHeight = size * 1.38;
  setFont(ctx, serif(), size, 0, "italic");
  ctx.textAlign = "center";
  const lines = wrapLines(ctx, `“${face.text}”`, width * 0.74, 11, {
    balance: true,
  });
  const block = lines.length * lineHeight;
  const top = (height - block) / 2 - height * 0.03;
  drawLines(ctx, lines, width / 2, top, lineHeight);

  if (mine) {
    // O lápis corre linha a linha, no ritmo de quem sublinha lendo
    const random = seeded(face.text);
    const total = lines.length;
    lines.forEach((line, index) => {
      const lineWidth = ctx.measureText(line).width;
      const amount = Math.min(1, Math.max(0, progress * total - index));
      pencilStroke(
        ctx,
        width / 2 - lineWidth / 2 - size * 0.1,
        width / 2 + lineWidth / 2 + size * 0.1,
        top + lineHeight * (index + 0.5) + size * 0.52,
        amount,
        random,
        width * 0.0042,
      );
    });
    if (face.page) {
      ctx.save();
      ctx.globalAlpha = 0.6 * Math.min(1, progress * 1.6);
      ctx.translate(width * 0.86, height * 0.07);
      ctx.rotate(-0.07);
      setFont(ctx, serif(), width * 0.042, 0, "italic");
      ctx.textAlign = "right";
      ctx.fillText(`p. ${face.page}`, 0, 0);
      ctx.restore();
    }
  } else {
    const credit = `— @${face.credit}${face.page ? ` · p. ${face.page}` : ""}`;
    setFont(ctx, mono(), width * 0.024, 0.06);
    drawLines(
      ctx,
      [credit],
      width / 2,
      top + block + height * 0.025,
      width * 0.036,
    );
  }

  marginNotes(ctx, face.alsoMarked, width, height * 0.86);
  return page.canvas;
}

/** "Você parou aqui": a página atual, o progresso e a fita sobre o papel. */
export function drawBookmarkFace(
  face: Extract<Face, { kind: "bookmark" }>,
  aspect: number,
  ribbon: string,
) {
  const { canvas, ctx, width, height } = pageCanvas(aspect);
  // A fita desce do alto, com o corte em V na ponta
  const ribbonX = width * 0.72;
  const ribbonWidth = width * 0.055;
  const ribbonEnd = height * 0.62;
  ctx.save();
  ctx.fillStyle = ribbon;
  ctx.beginPath();
  ctx.moveTo(ribbonX, 0);
  ctx.lineTo(ribbonX + ribbonWidth, 0);
  ctx.lineTo(ribbonX + ribbonWidth, ribbonEnd);
  ctx.lineTo(ribbonX + ribbonWidth / 2, ribbonEnd - ribbonWidth * 0.6);
  ctx.lineTo(ribbonX, ribbonEnd);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  caption(ctx, "VOCÊ PAROU AQUI", width, height * 0.3);
  setFont(ctx, serif(), width * 0.16, -0.02);
  ctx.textAlign = "center";
  drawLines(ctx, [`p. ${face.page}`], width / 2, height * 0.36, width * 0.2);
  if (face.total) {
    setFont(ctx, mono(), width * 0.028, 0.06);
    drawLines(
      ctx,
      [`de ${face.total}`],
      width / 2,
      height * 0.56,
      width * 0.04,
    );
    const barWidth = width * 0.5;
    const barX = (width - barWidth) / 2;
    const barY = height * 0.64;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillRect(barX, barY, barWidth, width * 0.006);
    ctx.globalAlpha = 1;
    ctx.fillRect(
      barX,
      barY,
      barWidth * Math.min(1, face.page / face.total),
      width * 0.006,
    );
    ctx.restore();
  }
  return canvas;
}

/** Um trecho: a primeira frase (domínio público) ou a mais guardada. */
export function drawExcerptFace(
  face: Extract<Face, { kind: "excerpt" }>,
  aspect: number,
) {
  const { canvas, ctx, width, height } = pageCanvas(aspect);
  caption(ctx, face.label, width, height * 0.1);
  const size = width * 0.052;
  const lineHeight = size * 1.36;
  setFont(ctx, serif(), size, 0);
  ctx.textAlign = "center";
  const lines = wrapLines(ctx, face.text, width * 0.74, 10, { balance: true });
  drawLines(
    ctx,
    lines,
    width / 2,
    (height - lines.length * lineHeight) / 2,
    lineHeight,
  );
  ctx.save();
  ctx.globalAlpha = 0.6;
  setFont(ctx, mono(), width * 0.022, 0.04);
  drawLines(
    ctx,
    wrapLines(ctx, face.detail, width * 0.74, 2),
    width / 2,
    height * 0.84,
    width * 0.034,
  );
  ctx.restore();
  return canvas;
}

/**
 * As discussões do fórum sobre o livro: o título de cada uma e as respostas.
 * Devolve também onde cada uma fica na página, para o toque abrir.
 */
export function drawDiscussionsFace(
  face: Extract<Face, { kind: "discussions" }>,
  aspect: number,
): { canvas: HTMLCanvasElement; links: PageLink[] } {
  const { canvas, ctx, width, height } = pageCanvas(aspect);
  caption(ctx, "NA COMUNIDADE", width, height * 0.1);
  setFont(ctx, serif(), width * 0.07, -0.02);
  ctx.textAlign = "center";
  drawLines(
    ctx,
    ["Conversas sobre", "este livro"],
    width / 2,
    height * 0.15,
    width * 0.078,
  );

  const padX = width * 0.12;
  const inner = width - 2 * padX;
  let top = height * 0.36;
  const links: PageLink[] = [];
  for (const topic of face.topics) {
    const start = top;
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillRect(padX, top, inner, 2);
    ctx.restore();
    top += height * 0.03;
    setFont(ctx, sans(), width * 0.04, -0.01);
    ctx.textAlign = "left";
    const title = wrapLines(ctx, topic.title, inner * 0.9, 2);
    drawLines(ctx, title, padX, top, width * 0.056);
    top += title.length * width * 0.056 + height * 0.01;
    ctx.save();
    ctx.globalAlpha = 0.6;
    setFont(ctx, mono(), width * 0.024, 0.04);
    const replies =
      topic.replies === 1 ? "1 resposta" : `${topic.replies} respostas`;
    drawLines(
      ctx,
      [`${replies} · toque para abrir  →`],
      padX,
      top,
      width * 0.036,
    );
    ctx.restore();
    top += width * 0.036 + height * 0.035;
    links.push({
      top: start / height,
      bottom: top / height,
      topicId: topic.id,
    });
  }
  return { canvas, links };
}

/** "12 de outubro de 2026". */
const longDate = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * O ex-libris na guarda da capa: um carimbo de tinta, levemente torto e com
 * as falhas de um carimbo de borracha (sempre as mesmas para a mesma pessoa e
 * o mesmo livro), com o nome, a data e, se veio de outra estante, a
 * dedicatória. Fundo transparente: vai por cima da guarda.
 */
export function drawExLibris({
  name,
  addedAt,
  copiedFrom,
  seed,
}: {
  name: string;
  addedAt: string;
  copiedFrom: string | null;
  seed: string;
}) {
  const width = 640;
  const height = 800;
  const { canvas, ctx } = createCanvas(width, height);
  const random = seeded(seed);
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-0.045);
  ctx.translate(-width / 2, -height / 2);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;

  // A moldura dupla de cantos redondos
  const frame = (inset: number, line: number) => {
    ctx.lineWidth = line;
    ctx.beginPath();
    ctx.roundRect(
      inset,
      inset,
      width - 2 * inset,
      height - 2 * inset,
      44 - inset / 3,
    );
    ctx.stroke();
  };
  frame(28, 7);
  frame(48, 2.5);

  // As três lombadas do logo
  const spines = [
    { x: 268, y: 150, w: 26, h: 88, tilt: 0 },
    { x: 306, y: 132, w: 26, h: 106, tilt: 0 },
    { x: 344, y: 158, w: 26, h: 80, tilt: 0.17 },
  ];
  for (const spine of spines) {
    ctx.save();
    ctx.translate(spine.x + spine.w / 2, spine.y + spine.h);
    ctx.rotate(spine.tilt);
    ctx.beginPath();
    ctx.roundRect(-spine.w / 2, -spine.h, spine.w, spine.h, 6);
    ctx.fill();
    ctx.restore();
  }

  ctx.textAlign = "center";
  setFont(ctx, mono(), 30, 0.32);
  drawLines(ctx, ["EX-LIBRIS"], width / 2, 290, 44);
  setFont(ctx, serif(), 76, -0.01);
  drawLines(
    ctx,
    wrapLines(ctx, name, width - 170, 2, { balance: true }),
    width / 2,
    352,
    82,
  );
  ctx.fillRect(width / 2 - 40, 540, 80, 3);
  setFont(ctx, sans(), 28, 0);
  drawLines(
    ctx,
    ["na estante desde", longDate.format(new Date(addedAt))],
    width / 2,
    566,
    40,
  );
  if (copiedFrom) {
    setFont(ctx, serif(), 34, 0, "italic");
    drawLines(ctx, [`achado na estante de @${copiedFrom}`], width / 2, 668, 44);
  }

  // As falhas do carimbo: pontos onde a tinta não pegou
  ctx.globalCompositeOperation = "destination-out";
  for (let index = 0; index < 900; index++) {
    const radius = random() * 2.6 + 0.4;
    ctx.globalAlpha = 0.35 + random() * 0.65;
    ctx.beginPath();
    ctx.arc(random() * width, random() * height, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  return canvas;
}

/** As estrelas da nota (meia a cinco), em traço e preenchimento. */
function stars(
  ctx: CanvasRenderingContext2D,
  rating: number,
  centerX: number,
  y: number,
  size: number,
) {
  const gap = size * 1.25;
  const start = centerX - (gap * 4) / 2;
  const star = (x: number) => {
    ctx.beginPath();
    for (let point = 0; point < 10; point++) {
      const radius = point % 2 === 0 ? size / 2 : size / 4.6;
      const angle = -Math.PI / 2 + (point * Math.PI) / 5;
      ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    }
    ctx.closePath();
  };
  for (let index = 0; index < 5; index++) {
    const x = start + index * gap;
    const fill = Math.min(1, Math.max(0, rating - index));
    ctx.save();
    ctx.lineWidth = size * 0.06;
    star(x);
    ctx.stroke();
    if (fill > 0) {
      ctx.beginPath();
      ctx.rect(x - size / 2, y - size / 2, size * fill, size);
      ctx.clip();
      star(x);
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * O cartão da leitura de quem vê, na contracapa: a nota em estrelas e a
 * resenha (o começo dela), como um papel colado no verso do exemplar.
 */
export function drawReadingCard({
  rating,
  review,
}: {
  rating: number | null;
  review: string | null;
}) {
  const width = 900;
  const height = review ? 560 : 300;
  const { canvas, ctx } = createCanvas(width, height);
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.roundRect(4, 4, width - 8, height - 8, 22);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = INK;

  ctx.textAlign = "center";
  setFont(ctx, mono(), 26, 0.16);
  drawLines(ctx, ["SUA LEITURA"], width / 2, 44, 40);
  let top = 110;
  if (rating) {
    stars(ctx, rating, width / 2, top + 26, 58);
    top += 96;
  }
  if (review) {
    setFont(ctx, serif(), 44, 0, "italic");
    const lines = wrapLines(ctx, `“${review}”`, width - 140, 5, {
      balance: true,
    });
    drawLines(ctx, lines, width / 2, top, 56);
  }
  return canvas;
}

/** Papel em branco: o verso que sobra na última folha. */
export function drawBlankFace(aspect: number) {
  return pageCanvas(aspect).canvas;
}
