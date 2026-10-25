import type { BookVisual } from "@/features/books/types";

/** Quem aparece numa coleção: a dona e os colaboradores. */
export type Person = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

/** O que a interface precisa de uma coleção para o card, a espiada e o cabeçalho. */
export type CollectionVisual = {
  id: string;
  title: string;
  emoji: string | null;
  description: string | null;
  visibility: "public" | "private";
  isCollaborative: boolean;
  owner: Person;
  members: Person[];
  /** Crédito da cópia; `collection` só vem quando quem vê ainda pode ver a origem. */
  copiedFrom: {
    username: string;
    collection: { id: string; title: string } | null;
  } | null;
  bookCount: number;
  likeCount: number;
  /** Até 5 capas, na ordem da coleção. */
  covers: BookVisual[];
};

/** Um livro dentro da coleção: o lugar na ordem e a nota opcional. */
export type CollectionItemVisual = {
  book: BookVisual;
  position: string;
  note: string | null;
};
