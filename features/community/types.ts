import type { BookVisual } from "@/features/books/types";
import type { Reader } from "@/features/social/types";

export type ForumCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

export const TOPIC_SORTS = [
  { value: "recentes", label: "Atividade recente" },
  { value: "populares", label: "Populares" },
  { value: "sem-resposta", label: "Sem resposta" },
] as const;

export type TopicSort = (typeof TOPIC_SORTS)[number]["value"];

/** Um tópico na lista: o bastante para o card, sem o corpo inteiro. */
export type TopicSummary = {
  id: string;
  title: string;
  excerpt: string;
  category: { slug: string; name: string };
  author: Reader | null;
  tags: string[];
  containsSpoilers: boolean;
  pinned: boolean;
  locked: boolean;
  hidden: boolean;
  replyCount: number;
  likeCount: number;
  usefulCount: number;
  lastActivityAt: string;
  createdAt: string;
  books: BookVisual[];
};

export type TopicsPage = { topics: TopicSummary[]; next: number | null };

export type ReactionKind = "like" | "useful";

export type Reactions = {
  like: number;
  useful: number;
  /** As reações de quem vê. */
  mine: ReactionKind[];
};

export type ForumReply = {
  id: string;
  parentId: string | null;
  quoted: { id: string; author: string | null; excerpt: string } | null;
  body: string;
  author: Reader | null;
  reactions: Reactions;
  editedAt: string | null;
  deleted: boolean;
  hidden: boolean;
  createdAt: string;
};

export type TopicDetail = Omit<
  TopicSummary,
  "excerpt" | "likeCount" | "usefulCount"
> & {
  body: string;
  categoryId: string;
  editedAt: string | null;
  reactions: Reactions;
  replies: ForumReply[];
  /** Os livros citados no tópico e nas respostas ([[livro:<id>]]). */
  bookMap: Record<string, BookVisual>;
  subscribed: boolean;
  viewer: { id: string; isAuthor: boolean; staff: boolean } | null;
};

export const REPORT_REASONS = [
  { value: "spam", label: "Spam ou propaganda" },
  { value: "ofensivo", label: "Ofensivo ou abusivo" },
  { value: "spoiler", label: "Spoiler sem aviso" },
  { value: "fora_do_tema", label: "Fora do tema" },
  { value: "outro", label: "Outro motivo" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export type ReportTarget =
  "topic" | "reply" | "suggestion" | "suggestion_comment";
