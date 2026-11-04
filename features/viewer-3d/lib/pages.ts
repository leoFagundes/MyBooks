import type { CommunityQuote } from "@/features/books/queries";
import { type BookCopy, quoteKey } from "./copy";

/** No máximo cinco folhas para virar: dez páginas. */
export const MAX_LEAVES = 5;
const MAX_FACES = MAX_LEAVES * 2;
const MY_QUOTES = 4;
const COMMUNITY_QUOTES = 3;

/** O que cada página das folhas mostra. */
export type Face =
  /** A folha de rosto (a frente da primeira folha). */
  | { kind: "title" }
  /** Onde quem vê parou, com a fita. */
  | { kind: "bookmark"; page: number; total: number | null }
  /** Uma citação: a de quem vê, sublinhada a lápis, ou a da comunidade. */
  | {
      kind: "quote";
      text: string;
      page: number | null;
      /** O @ de quem guardou; null nas de quem vê. */
      credit: string | null;
      /** Quem mais guardou o mesmo trecho (as notas de margem). */
      alsoMarked: string[];
    }
  /** Um trecho: a primeira frase (domínio público) ou a mais guardada. */
  | { kind: "excerpt"; text: string; label: string; detail: string }
  /** As discussões do fórum sobre o livro (tocar abre). */
  | { kind: "discussions"; topics: BookCopy["discussions"] }
  | { kind: "blank" };

export type PageLayout = {
  /** Quantas folhas se viram (0: a folha de rosto fica no miolo, parada). */
  leafCount: number;
  /** As faces das folhas: frente da 1ª, verso da 1ª, frente da 2ª… */
  faces: Face[];
  /** A citação do pé da folha de rosto. */
  titleQuote: CommunityQuote | null;
};

/**
 * Folhear (spec §5.7) o exemplar de quem vê: a folha de rosto, onde ela
 * parou, as citações dela (a lápis), as da comunidade, um trecho e, por
 * último, as discussões. Sem nada além da folha de rosto, não há folha para
 * virar. Faltando lugar, saem primeiro as citações da comunidade.
 */
export function pageLayout(
  quotes: CommunityQuote[],
  copy: BookCopy,
  pageCount: number | null,
): PageLayout {
  const mine = copy.mine;
  // As citações de quem vê vão para as páginas dela, a lápis: o pé da folha
  // de rosto fica com a de outra pessoa
  const own = new Set(
    (mine?.quotes ?? []).map((quote) => quoteKey(quote.text)),
  );
  const others = quotes.filter((quote) => !own.has(quoteKey(quote.text)));
  const titleQuote = others[0] ?? null;
  const shown = new Set(titleQuote ? [quoteKey(titleQuote.text)] : []);

  const lead: Face[] = [];
  if (mine?.status === "reading" && mine.currentPage) {
    lead.push({ kind: "bookmark", page: mine.currentPage, total: pageCount });
  }
  for (const quote of (mine?.quotes ?? []).slice(0, MY_QUOTES)) {
    const key = quoteKey(quote.text);
    shown.add(key);
    lead.push({
      kind: "quote",
      text: quote.text,
      page: quote.page,
      credit: null,
      alsoMarked: copy.savedBy[key] ?? [],
    });
  }

  const community: Face[] = [];
  for (const quote of others.slice(1)) {
    const key = quoteKey(quote.text);
    if (shown.has(key) || community.length >= COMMUNITY_QUOTES) continue;
    shown.add(key);
    community.push({
      kind: "quote",
      text: quote.text,
      page: quote.page,
      credit: quote.reader.username,
      alsoMarked: (copy.savedBy[key] ?? []).filter(
        (username) => username !== quote.reader.username,
      ),
    });
  }

  const tail: Face[] = [];
  if (copy.reading?.firstSentence) {
    tail.push({
      kind: "excerpt",
      text: copy.reading.firstSentence,
      label: "A PRIMEIRA FRASE",
      detail: "Domínio público · leia o livro inteiro no Internet Archive",
    });
  } else if (copy.mostSaved && !shown.has(quoteKey(copy.mostSaved.text))) {
    tail.push({
      kind: "excerpt",
      text: copy.mostSaved.text,
      label: "A MAIS GUARDADA",
      detail: `${copy.mostSaved.count} leitores guardaram este trecho`,
    });
  }
  if (copy.discussions.length > 0) {
    tail.push({ kind: "discussions", topics: copy.discussions });
  }

  const room = MAX_FACES - 1 - lead.length - tail.length;
  const content = [
    ...lead,
    ...community.slice(0, Math.max(0, room)),
    ...tail,
  ].slice(0, MAX_FACES - 1);
  if (content.length === 0) return { leafCount: 0, faces: [], titleQuote };

  const leafCount = Math.ceil((content.length + 1) / 2);
  const faces: Face[] = [{ kind: "title" }, ...content];
  while (faces.length < leafCount * 2) faces.push({ kind: "blank" });
  return { leafCount, faces, titleQuote };
}

/** Onde está a página do marcador, se houver (o índice da face). */
export function bookmarkFace(layout: PageLayout) {
  return layout.faces.findIndex((face) => face.kind === "bookmark");
}
