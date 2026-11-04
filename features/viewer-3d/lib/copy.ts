import type { ShelfStatus } from "@/features/shelf/schemas";

/** O exemplar de quem vê, para o livro em 3D. */
export type MyCopy = {
  displayName: string;
  status: ShelfStatus;
  currentPage: number | null;
  rating: number | null;
  review: string | null;
  /** Quando o livro entrou na estante (o ex-libris). */
  addedAt: string;
  /** De quem o livro foi copiado (a dedicatória), se foi. */
  copiedFrom: string | null;
  /** As citações que a pessoa guardou, na ordem das páginas. */
  quotes: { text: string; page: number | null }[];
};

/** Tudo o que o 3D mostra além do livro: o exemplar, as marcas e o fórum. */
export type BookCopy = {
  mine: MyCopy | null;
  /** Quem guardou cada trecho (a chave é o texto normalizado), sem quem vê. */
  savedBy: Record<string, string[]>;
  /** O trecho que mais leitores guardaram, se ao menos dois guardaram. */
  mostSaved: { text: string; page: number | null; count: number } | null;
  discussions: { id: string; title: string; replies: number }[];
  /** Só em domínio público: onde ler e a primeira frase. */
  reading: { url: string; firstSentence: string | null } | null;
};

export const EMPTY_COPY: BookCopy = {
  mine: null,
  savedBy: {},
  mostSaved: null,
  discussions: [],
  reading: null,
};

/** O mesmo trecho guardado por duas pessoas, mesmo com aspas ou espaços diferentes. */
export function quoteKey(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[“”"'‘’«».,;:!?…—–-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
