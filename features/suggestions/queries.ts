import "server-only";
import { connection } from "next/server";
import { plainText } from "@/features/community/lib/markdown";
import { toReader } from "@/features/social/queries";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  type SimilarSuggestion,
  SUGGESTION_STATUSES,
  type SuggestionCategory,
  type SuggestionDetail,
  type SuggestionSort,
  type SuggestionStatus,
  type SuggestionSummary,
  type SuggestionsPage,
} from "./types";

export const SUGGESTIONS_PAGE = 20;
const PERSON = "id, username, display_name, avatar_url";
const COLUMNS = `id, title, body, category, status, vote_count, comment_count, created_at, hidden_at, author:profiles!feature_suggestions_author_id_fkey(${PERSON})`;

type Row = {
  id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  vote_count: number;
  comment_count: number;
  created_at: string;
  hidden_at: string | null;
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

const isStatus = (value: string): value is SuggestionStatus =>
  SUGGESTION_STATUSES.some((item) => item.value === value);

function toSummary(row: Row, voted: Set<string>): SuggestionSummary {
  const text = plainText(row.body);
  return {
    id: row.id,
    title: row.title,
    excerpt: text.length > 180 ? `${text.slice(0, 179).trimEnd()}…` : text,
    category: row.category as SuggestionCategory,
    status: isStatus(row.status) ? row.status : "nova",
    author: row.author ? toReader(row.author) : null,
    votes: row.vote_count,
    comments: row.comment_count,
    voted: voted.has(row.id),
    createdAt: row.created_at,
  };
}

async function votedBy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  viewerId: string | null,
  ids: string[],
) {
  if (!viewerId || ids.length === 0) return new Set<string>();
  const { data } = await supabase
    .from("suggestion_votes")
    .select("suggestion_id")
    .eq("user_id", viewerId)
    .in("suggestion_id", ids);
  return new Set((data ?? []).map((row) => row.suggestion_id));
}

/**
 * Uma página das sugestões (MELHORIAS 8.2): mais votadas ou mais recentes,
 * num status ou em todos, com o voto de quem vê. Lida no pedido (o voto é
 * de quem vê), sem cache.
 */
export async function getSuggestions({
  sort,
  status,
  page,
}: {
  sort: SuggestionSort;
  status: SuggestionStatus | null;
  page: number;
}): Promise<SuggestionsPage> {
  await connection();
  const supabase = await createClient();
  const viewer = await getViewer();
  let request = supabase.from("feature_suggestions").select(COLUMNS);
  if (status) request = request.eq("status", status);
  request =
    sort === "recentes"
      ? request.order("created_at", { ascending: false })
      : request
          .order("vote_count", { ascending: false })
          .order("created_at", { ascending: false });
  const from = page * SUGGESTIONS_PAGE;
  const { data, error } = await request.range(from, from + SUGGESTIONS_PAGE);
  if (error) throw error;
  const rows = data as unknown as Row[];
  const shown = rows.slice(0, SUGGESTIONS_PAGE);
  const voted = await votedBy(
    supabase,
    viewer?.id ?? null,
    shown.map((row) => row.id),
  );
  return {
    suggestions: shown.map((row) => toSummary(row, voted)),
    next: rows.length > SUGGESTIONS_PAGE ? page + 1 : null,
  };
}

/** Uma sugestão com a resposta oficial e os comentários. */
export async function getSuggestion(
  id: string,
): Promise<SuggestionDetail | null> {
  await connection();
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const viewer = await getViewer();
  const { data } = await supabase
    .from("feature_suggestions")
    .select(
      `${COLUMNS}, official_response, responded_at, responder:profiles!feature_suggestions_responded_by_fkey(username)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as Row & {
    official_response: string | null;
    responded_at: string | null;
    responder: { username: string } | null;
  };
  const [comments, voted, admin, staff] = await Promise.all([
    supabase
      .from("suggestion_comments")
      .select(
        `id, body, created_at, edited_at, deleted_at, hidden_at, author:profiles!suggestion_comments_author_id_fkey(${PERSON})`,
      )
      .eq("suggestion_id", id)
      .order("created_at", { ascending: true })
      .limit(300),
    votedBy(supabase, viewer?.id ?? null, [id]),
    viewer ? supabase.rpc("is_admin") : Promise.resolve({ data: false }),
    viewer ? supabase.rpc("is_moderator") : Promise.resolve({ data: false }),
  ]);
  return {
    ...toSummary(row, voted),
    body: row.body,
    hidden: row.hidden_at !== null,
    response: row.official_response
      ? {
          text: row.official_response,
          by: row.responder?.username ?? null,
          at: row.responded_at,
        }
      : null,
    commentsList: (comments.data ?? []).map((comment) => {
      const deleted = comment.deleted_at !== null;
      return {
        id: comment.id,
        body: deleted ? "" : comment.body,
        author: deleted || !comment.author ? null : toReader(comment.author),
        createdAt: comment.created_at,
        editedAt: comment.edited_at,
        deleted,
        hidden: comment.hidden_at !== null,
      };
    }),
    viewer: viewer
      ? {
          id: viewer.id,
          isAuthor: viewer.id === row.author?.id,
          staff: staff.data === true,
          admin: admin.data === true,
        }
      : null,
  };
}

/** As sugestões de título parecido (pg_trgm), para votar em vez de repetir. */
export async function getSimilarSuggestions(
  q: string,
): Promise<SimilarSuggestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("similar_suggestions", {
    q,
    max_results: 5,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    votes: row.vote_count,
  }));
}
