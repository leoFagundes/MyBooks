/** Leitor sugerido para seguir (onboarding e, na Fase 5, o Explorar). */
export type SuggestedReader = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  favoriteGenres: string[];
};
