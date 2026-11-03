// Markdown leve da comunidade (MELHORIAS 8): títulos (# e ##), negrito,
// itálico, links, citações, listas, ||spoiler||, @menções e livros ([[livro:<id>]]). Vira uma
// árvore própria, que o RichText desenha como elementos React: nenhum HTML de
// quem escreveu chega à página, e link só com http ou https.

export type Inline =
  | { t: "text"; v: string }
  | { t: "br" }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "spoiler"; c: Inline[] }
  | { t: "link"; href: string; c: Inline[] }
  | { t: "mention"; username: string }
  | { t: "book"; id: string };

export type Block =
  | { t: "h"; level: 1 | 2; c: Inline[] }
  | { t: "p"; c: Inline[] }
  | { t: "quote"; c: Block[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; items: Inline[][] };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const BOOK_TOKEN = new RegExp(`\\[\\[livro:(${UUID})\\]\\]`, "g");
const MENTION = /(^|[^a-zA-Z0-9_@])@([a-zA-Z0-9_]{3,20})/g;

// Em ordem de preferência: o primeiro que casar no ponto mais cedo vence
const INLINE = new RegExp(
  [
    `\\[\\[livro:(?<book>${UUID})\\]\\]`,
    String.raw`\|\|(?<spoiler>[^|\n]+?)\|\|`,
    String.raw`\*\*(?<strong>[^*\n]+?)\*\*`,
    String.raw`\[(?<label>[^\]\n]+)\]\((?<href>https?:\/\/[^\s)]+)\)`,
    String.raw`(?<url>https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])`,
    String.raw`(?<![\w*])\*(?<em>[^*\n]+?)\*(?![\w*])`,
    String.raw`(?<![\w])_(?<em2>[^_\n]+?)_(?![\w])`,
    String.raw`(?<![\w@])@(?<mention>[a-zA-Z0-9_]{3,20})`,
  ].join("|"),
  "g",
);

/** Só http e https, e o endereço tem de ser um URL de verdade. */
export function safeHref(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

/** O texto de uma linha, com os marcadores de dentro. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const groups = match.groups ?? {};
    const start = match.index ?? 0;
    if (start > last) out.push({ t: "text", v: text.slice(last, start) });
    last = start + match[0].length;
    if (groups.book) out.push({ t: "book", id: groups.book });
    else if (groups.spoiler)
      out.push({ t: "spoiler", c: parseInline(groups.spoiler) });
    else if (groups.strong)
      out.push({ t: "strong", c: parseInline(groups.strong) });
    else if (groups.label && groups.href) {
      const href = safeHref(groups.href);
      out.push(
        href
          ? { t: "link", href, c: parseInline(groups.label) }
          : { t: "text", v: match[0] },
      );
    } else if (groups.url) {
      const href = safeHref(groups.url);
      out.push(
        href
          ? { t: "link", href, c: [{ t: "text", v: groups.url }] }
          : { t: "text", v: groups.url },
      );
    } else if (groups.em ?? groups.em2) {
      out.push({
        t: "em",
        c: parseInline((groups.em ?? groups.em2) as string),
      });
    } else if (groups.mention) {
      out.push({ t: "mention", username: groups.mention.toLowerCase() });
    }
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}

function lines(text: string): Inline[] {
  const out: Inline[] = [];
  text.split("\n").forEach((line, index) => {
    if (index > 0) out.push({ t: "br" });
    out.push(...parseInline(line));
  });
  return out;
}

const HEADING = /^(#{1,2})\s+(.+)$/;
const QUOTE = /^>\s?/;
const BULLET = /^[-*]\s+/;
const NUMBER = /^\d+[.)]\s+/;

/** Os pedaços entre linhas em branco, com cada título numa linha só dele. */
function chunks(text: string): string[] {
  const out: string[] = [];
  for (const chunk of text.split(/\n{2,}/)) {
    let rest: string[] = [];
    for (const row of chunk.split("\n")) {
      if (!HEADING.test(row)) {
        rest.push(row);
        continue;
      }
      if (rest.length) out.push(rest.join("\n"));
      out.push(row);
      rest = [];
    }
    if (rest.length) out.push(rest.join("\n"));
  }
  return out;
}

/** O texto inteiro em blocos: títulos, parágrafos, citações e listas. */
export function parseMarkdown(source: string, depth = 0): Block[] {
  const text = source.replace(/\r\n?/g, "\n").trim();
  if (!text) return [];
  const blocks: Block[] = [];
  for (const chunk of chunks(text)) {
    const rows = chunk.split("\n");
    const heading = HEADING.exec(chunk);
    if (heading) {
      blocks.push({
        t: "h",
        level: heading[1] === "#" ? 1 : 2,
        c: parseInline((heading[2] as string).trim()),
      });
      continue;
    }
    if (depth < 3 && rows.every((row) => QUOTE.test(row))) {
      blocks.push({
        t: "quote",
        c: parseMarkdown(
          rows.map((row) => row.replace(QUOTE, "")).join("\n"),
          depth + 1,
        ),
      });
    } else if (rows.every((row) => BULLET.test(row))) {
      blocks.push({
        t: "ul",
        items: rows.map((row) => parseInline(row.replace(BULLET, ""))),
      });
    } else if (rows.every((row) => NUMBER.test(row))) {
      blocks.push({
        t: "ol",
        items: rows.map((row) => parseInline(row.replace(NUMBER, ""))),
      });
    } else {
      blocks.push({ t: "p", c: lines(chunk) });
    }
  }
  return blocks;
}

/** Os livros citados num texto, para buscar as capas de uma vez. */
export function bookIdsIn(text: string): string[] {
  return [
    ...new Set(
      [...text.matchAll(BOOK_TOKEN)].map((match) => match[1] as string),
    ),
  ];
}

/** Os @ citados, em minúsculas e sem repetir. */
export function mentionsIn(text: string): string[] {
  return [
    ...new Set(
      [...text.matchAll(MENTION)].map((match) =>
        (match[2] as string).toLowerCase(),
      ),
    ),
  ];
}

/** O texto sem marcação, para resumos e para a citação de uma resposta. */
export function plainText(source: string): string {
  return source
    .replace(BOOK_TOKEN, "")
    .replace(/\|\|([^|]+)\|\|/g, "(spoiler)")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
