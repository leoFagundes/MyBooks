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
