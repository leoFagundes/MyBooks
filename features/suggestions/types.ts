import type { Reader } from "@/features/social/types";

export const SUGGESTION_CATEGORIES = [
  { value: "funcionalidade", label: "Funcionalidade" },
  { value: "melhoria", label: "Melhoria" },
  { value: "bug", label: "Bug" },
  { value: "outro", label: "Outro" },
] as const;

export type SuggestionCategory =
  (typeof SUGGESTION_CATEGORIES)[number]["value"];

export const SUGGESTION_STATUSES = [
  { value: "nova", label: "Nova" },
  { value: "em_analise", label: "Em análise" },
  { value: "planejada", label: "Planejada" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "recusada", label: "Recusada" },
] as const;

export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number]["value"];

export const SUGGESTION_SORTS = [
  { value: "votadas", label: "Mais votadas" },
  { value: "recentes", label: "Mais recentes" },
] as const;

export type SuggestionSort = (typeof SUGGESTION_SORTS)[number]["value"];

export const statusLabel = (status: string) =>
  SUGGESTION_STATUSES.find((item) => item.value === status)?.label ?? status;

export const categoryLabel = (category: string) =>
  SUGGESTION_CATEGORIES.find((item) => item.value === category)?.label ??
  category;

export type SuggestionSummary = {
  id: string;
  title: string;
  excerpt: string;
  category: SuggestionCategory;
  status: SuggestionStatus;
  author: Reader | null;
  votes: number;
  comments: number;
  /** Quem vê já votou. */
  voted: boolean;
  createdAt: string;
};

export type SuggestionsPage = {
  suggestions: SuggestionSummary[];
  next: number | null;
};

export type SuggestionComment = {
  id: string;
  body: string;
  author: Reader | null;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  hidden: boolean;
};

export type SuggestionDetail = SuggestionSummary & {
  body: string;
  response: { text: string; by: string | null; at: string | null } | null;
  hidden: boolean;
  commentsList: SuggestionComment[];
  viewer: {
    id: string;
    isAuthor: boolean;
    staff: boolean;
    admin: boolean;
  } | null;
};

export type SimilarSuggestion = {
  id: string;
  title: string;
  status: string;
  votes: number;
};
