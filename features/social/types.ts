import type { BookVisual } from "@/features/books/types";

/** Quem está vendo diante de um leitor: não segue, segue ou pediu para seguir. */
export type FollowState = "none" | "accepted" | "pending";

/** O mesmo, e também o próprio perfil e o visitante sem conta. */
export type ReaderState = FollowState | "self" | "visitor";

/** Um leitor como aparece em listas, avisos e no feed. */
export type Reader = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

/** Leitor sugerido para seguir (onboarding, Explorar e o Início vazio). */
export type SuggestedReader = Reader & {
  isPrivate: boolean;
  favoriteGenres: string[];
};

/** Um pedido para seguir esperando resposta. */
export type FollowRequest = { reader: Reader; at: string };

export type NotificationType =
  | "follow"
  | "collection_like"
  | "collection_copy"
  | "collection_invite"
  | "catalog_review";

/** O resultado de uma revisão da equipe (MELHORIAS 7), no aviso catalog_review. */
export type ReviewNotice = {
  kind:
    | "book_approved"
    | "book_rejected"
    | "book_merged"
    | "book_removed"
    | "suggestion_approved"
    | "suggestion_rejected"
    | "genre_approved"
    | "genre_rejected";
  bookId: string | null;
  title: string;
  note: string | null;
};

/** Um aviso do popover (os pedidos para seguir vêm à parte). */
export type NotificationItem = {
  id: string;
  type: NotificationType;
  actor: Reader | null;
  /** A coleção curtida, copiada ou do convite, enquanto quem vê puder vê-la. */
  collection: { id: string; title: string } | null;
  /** Só no catalog_review: o que a equipe decidiu. */
  review: ReviewNotice | null;
  at: string;
  unread: boolean;
};

export type NotificationsPayload = {
  unread: number;
  requests: FollowRequest[];
  items: NotificationItem[];
};

/** Afinidade literária (reading_affinity): de 0 a 100 e os livros em comum. */
export type Affinity = { score: number; commonBooks: number };

export const ACTIVITY_TYPES = [
  "shelf_want",
  "shelf_reading",
  "shelf_read",
  "shelf_abandoned",
  "collection_create",
  "collection_add",
  "follow",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Onde a próxima página do feed começa: a última atividade mostrada. */
export type FeedCursor = { at: string; id: string };

/** Uma atividade do feed, já com o livro, a coleção ou a pessoa seguida. */
export type ActivityRow = {
  id: string;
  type: ActivityType;
  at: string;
  actor: Reader;
  book: BookVisual | null;
  collection: { id: string; title: string; emoji: string | null } | null;
  target: Reader | null;
};

/** Atividades seguidas da mesma pessoa, do mesmo tipo, juntas num card. */
export type FeedGroup = {
  /** O id da atividade mais nova do grupo. */
  key: string;
  type: ActivityType;
  actor: Reader;
  /** Quando foi a mais nova. */
  at: string;
  books: BookVisual[];
  collection: ActivityRow["collection"];
  people: Reader[];
};

export type FeedPage = { groups: FeedGroup[]; next: FeedCursor | null };
