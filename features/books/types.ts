/** O que a interface precisa de um livro para desenhar capa e lombada. */
export type BookVisual = {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  /** Cor dominante da capa, em hex; extraída ao salvar o livro (Fase 3). */
  coverColor: string | null;
  pageCount: number | null;
  publishedYear: number | null;
};
