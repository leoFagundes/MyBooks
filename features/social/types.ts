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
  | "collection_invite";

/** Um aviso do popover (os pedidos para seguir vêm à parte). */
export type NotificationItem = {
  id: string;
  type: NotificationType;
  actor: Reader | null;
  /** A coleção curtida, copiada ou do convite, enquanto quem vê puder vê-la. */
  collection: { id: string; title: string } | null;
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
