import type { CoverStyle } from "./lib/cover-style";

/** O que a interface precisa de um livro para desenhar capa e lombada. */
export type BookVisual = {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  /** Cor dominante da capa (ou a escolhida no cadastro), em hex. */
  coverColor: string | null;
  /** Desenho da capa tipográfica, quando não há imagem. */
  coverStyle: CoverStyle;
  pageCount: number | null;
  publishedYear: number | null;
};
