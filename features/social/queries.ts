import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { toBookVisual } from "@/features/books/lib/to-book-visual";
import { avatarSrc } from "@/features/profile/lib/avatar";
import { getViewer } from "@/lib/auth";
import { getPublicEnv } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { FEED_PAGE_SIZE, groupActivities } from "./lib/feed";
import {
  ACTIVITY_TYPES,
  type ActivityRow,
  type ActivityType,
  type Affinity,
  type FeedCursor,
  type FeedPage,
  type FollowState,
  type NotificationItem,
  type NotificationsPayload,
  type Reader,
  type ReaderState,
  type ForumNotice,
  type ReviewNotice,
  type SuggestionNotice,
  type SuggestedReader,
} from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type ReaderRowData = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export function toReader(row: ReaderRowData): Reader {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name?.trim() || row.username,
    avatarUrl: avatarSrc(row.avatar_url, getPublicEnv().supabaseUrl),
  };
}

function toSuggested(
  row: ReaderRowData & { is_private: boolean; favorite_genres: string[] },
): SuggestedReader {
  return {
    ...toReader(row),
    isPrivate: row.is_private,
    favoriteGenres: row.favorite_genres,
  };
}

/**
 * Leitores para seguir: quem divide mais gêneros com quem está vendo
 * (suggested_readers, no banco). Sem sessão, lista vazia.
 */
export async function getSuggestedReaders(
  limit = 6,
): Promise<SuggestedReader[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("suggested_readers", {
    max_results: limit,
  });
  if (error) throw error;
  return data.map(toSuggested);
}

/** Como quem está vendo segue cada uma dessas pessoas. */
export async function followStates(
  supabase: Supabase,
  viewerId: string,
  ids: string[],
): Promise<Record<string, FollowState>> {
  if (ids.length === 0) return {};
  const { data, error } = await supabase
    .from("follows")
    .select("following_id, status")
    .eq("follower_id", viewerId)
    .in("following_id", ids);
  if (error) throw error;
  return Object.fromEntries(
    data.map((row) => [
      row.following_id,
      row.status === "accepted" ? "accepted" : "pending",
    ]),
  );
}

/** O leitor diante de quem vê: a própria pessoa, visitante ou o follow. */
export function readerState(
  id: string,
  viewerId: string | null,
  states: Record<string, FollowState>,
): ReaderState {
  if (!viewerId) return "visitor";
  if (id === viewerId) return "self";
  return states[id] ?? "none";
}

export type ReaderListItem = SuggestedReader & { state: ReaderState };

const PERSON_COLUMNS =
  "id, username, display_name, avatar_url, is_private, favorite_genres";

/**
 * Seguidores ou quem a pessoa segue (só os aceitos), do mais novo ao mais
 * antigo, com o botão de quem está vendo diante de cada um.
 */
export async function readFollowList(
  supabase: Supabase,
  profileId: string,
  list: "followers" | "following",
  viewerId: string | null,
): Promise<ReaderListItem[]> {
  const query =
    list === "followers"
      ? supabase
          .from("follows")
          .select(`person:profiles!follows_follower_id_fkey(${PERSON_COLUMNS})`)
          .eq("following_id", profileId)
      : supabase
          .from("follows")
          .select(
            `person:profiles!follows_following_id_fkey(${PERSON_COLUMNS})`,
          )
          .eq("follower_id", profileId);
  const { data, error } = await query
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const people = data.flatMap(({ person }) =>
    person ? [toSuggested(person)] : [],
  );
  const states = viewerId
    ? await followStates(
        supabase,
        viewerId,
        people.map((person) => person.id),
      )
    : {};
  return people.map((person) => ({
    ...person,
    state: readerState(person.id, viewerId, states),
  }));
}

const NOTIFICATION_TYPES = new Set<string>([
  "follow",
  "collection_like",
  "collection_copy",
  "collection_invite",
  "catalog_review",
  "forum_reply",
  "forum_mention",
  "suggestion_status",
]);

const text = (value: unknown) => (typeof value === "string" ? value : "");

function forumOf(refs: unknown): ForumNotice | null {
  const value = (refs ?? {}) as Record<string, unknown>;
  return typeof value.topic_id === "string"
    ? {
        topicId: value.topic_id,
        title: text(value.title),
        replyId: typeof value.reply_id === "string" ? value.reply_id : null,
      }
    : null;
}

function suggestionOf(refs: unknown): SuggestionNotice | null {
  const value = (refs ?? {}) as Record<string, unknown>;
  return typeof value.suggestion_id === "string"
    ? {
        id: value.suggestion_id,
        title: text(value.title),
        status: text(value.status),
      }
    : null;
}

const REVIEW_KINDS = new Set<string>([
  "book_approved",
  "book_rejected",
  "book_merged",
  "book_removed",
  "suggestion_approved",
  "suggestion_rejected",
  "genre_approved",
  "genre_rejected",
]);

function reviewOf(refs: unknown): ReviewNotice | null {
  if (!refs || typeof refs !== "object") return null;
  const value = refs as Record<string, unknown>;
  if (typeof value.kind !== "string" || !REVIEW_KINDS.has(value.kind)) {
    return null;
  }
  return {
    kind: value.kind as ReviewNotice["kind"],
    bookId: typeof value.book_id === "string" ? value.book_id : null,
    title: typeof value.title === "string" ? value.title : "",
    note: typeof value.note === "string" ? value.note : null,
  };
}

const isNotificationType = (value: string): value is NotificationItem["type"] =>
  NOTIFICATION_TYPES.has(value);

const READER_COLUMNS = "id, username, display_name, avatar_url";

/**
 * O popover de avisos: os pedidos para seguir pendentes (todos, de follows),
 * os 30 avisos mais novos e quantos ainda não foram lidos.
 */
export async function readNotifications(
  supabase: Supabase,
  userId: string,
): Promise<NotificationsPayload> {
  const [requests, items, unread] = await Promise.all([
    supabase
      .from("follows")
      .select(
        `created_at, person:profiles!follows_follower_id_fkey(${READER_COLUMNS})`,
      )
      .eq("following_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("notifications")
      .select(
        `id, type, refs, read_at, created_at, actor:profiles!notifications_actor_id_fkey(${READER_COLUMNS})`,
      )
      .eq("user_id", userId)
      .neq("type", "follow_request")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
  ]);
  if (requests.error) throw requests.error;
  if (items.error) throw items.error;
  if (unread.error) throw unread.error;

  const collectionOf = (refs: unknown) =>
    refs && typeof refs === "object" && "collection_id" in refs
      ? String(refs.collection_id)
      : null;
  const collectionIds = [
    ...new Set(items.data.flatMap((item) => collectionOf(item.refs) ?? [])),
  ];
  // A RLS esconde a coleção que quem vê não pode mais ver
  const { data: collections } =
    collectionIds.length > 0
      ? await supabase
          .from("collections")
          .select("id, title")
          .in("id", collectionIds)
      : { data: [] };
  const titles = new Map(
    (collections ?? []).map((collection) => [collection.id, collection]),
  );

  return {
    unread: unread.count ?? 0,
    requests: requests.data.flatMap(({ created_at, person }) =>
      person ? [{ reader: toReader(person), at: created_at }] : [],
    ),
    items: items.data.flatMap((item) => {
      if (!isNotificationType(item.type)) return [];
      const collectionId = collectionOf(item.refs);
      return [
        {
          id: item.id,
          type: item.type,
          actor: item.actor ? toReader(item.actor) : null,
          collection: collectionId ? (titles.get(collectionId) ?? null) : null,
          review: item.type === "catalog_review" ? reviewOf(item.refs) : null,
          forum:
            item.type === "forum_reply" || item.type === "forum_mention"
              ? forumOf(item.refs)
              : null,
          suggestion:
            item.type === "suggestion_status" ? suggestionOf(item.refs) : null,
          at: item.created_at,
          unread: item.read_at === null,
        },
      ];
    }),
  };
}

/**
 * A afinidade de quem está vendo com outro perfil (reading_affinity, no
 * banco). Null quando um dos lados ainda não tem livro nem gênero favorito.
 */
export async function getAffinity(
  viewerId: string,
  profile: { id: string },
): Promise<Affinity | null> {
  "use cache: private";
  cacheLife("minutes");
  cacheTag(`shelf:${viewerId}`, `shelf:${profile.id}`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("reading_affinity", { a: viewerId, b: profile.id })
    .maybeSingle();
  if (error || !data) return null;
  return { score: data.score, commonBooks: data.common_books };
}

/** Busca de leitores (Explorar): @ e nome, sem acento. Sem sessão. */
export async function searchReaders(query: string): Promise<SuggestedReader[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("explore");

  const { data, error } = await createPublicClient().rpc("search_readers", {
    q: query,
    max_results: 20,
  });
  if (error) throw error;
  return data.map(toSuggested);
}

export type AffinityReader = SuggestedReader & Affinity;

/**
 * Leitores com afinidade com quem está vendo (Explorar): quem ela ainda não
 * segue, do mais parecido ao menos. Sem sessão, null: a seção nem aparece.
 */
export async function getAffinityReaders(
  limit = 6,
): Promise<AffinityReader[] | null> {
  "use cache: private";
  cacheLife("minutes");

  const viewer = await getViewer();
  if (!viewer) return null;
  cacheTag(`shelf:${viewer.id}`, `profile:${viewer.username}`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("readers_by_affinity", {
    max_results: limit,
  });
  if (error) throw error;
  return data.map((row) => ({
    ...toSuggested(row),
    score: row.score,
    commonBooks: row.common_books,
  }));
}

/** As sugestões do Início vazio; seguir alguém atualiza feed:<id>. */
export async function getHomeSuggestions(
  viewerId: string,
  limit = 5,
): Promise<SuggestedReader[]> {
  "use cache: private";
  cacheLife("minutes");
  cacheTag(`feed:${viewerId}`);
  return getSuggestedReaders(limit);
}

const ACTIVITY_COLUMNS = `id, type, created_at, actor:profiles!activities_actor_id_fkey(${READER_COLUMNS}), book:books(id, title, authors, cover_url, cover_color, cover_style, page_count, published_year), collection:collections(id, title, emoji), target:profiles!activities_target_user_id_fkey(${READER_COLUMNS})`;

const isActivityType = (value: string): value is ActivityType =>
  (ACTIVITY_TYPES as readonly string[]).includes(value);

/**
 * Uma página do feed (feed_activities, no banco: só quem a pessoa segue, com
 * a RLS das atividades), já agrupada. Atividade cujo livro ou coleção sumiu
 * do alcance fica de fora.
 */
export async function readFeedPage(
  supabase: Supabase,
  cursor: FeedCursor | null,
): Promise<FeedPage> {
  const { data, error } = await supabase
    .rpc("feed_activities", {
      before_at: cursor?.at,
      before_id: cursor?.id,
      max_rows: FEED_PAGE_SIZE,
    })
    .select(ACTIVITY_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (error) throw error;
  const rows = data.flatMap((row): ActivityRow[] => {
    if (!isActivityType(row.type) || !row.actor) return [];
    const book = row.book ? toBookVisual(row.book) : null;
    const target = row.target ? toReader(row.target) : null;
    const needsBook =
      row.type.startsWith("shelf_") || row.type === "collection_add";
    if (needsBook && !book) return [];
    if (row.type.startsWith("collection_") && !row.collection) return [];
    if (row.type === "follow" && !target) return [];
    return [
      {
        id: row.id,
        type: row.type,
        at: row.created_at,
        actor: toReader(row.actor),
        book,
        collection: row.collection,
        target,
      },
    ];
  });
  const lastRow = data.at(-1);
  return groupActivities(rows, {
    full: data.length === FEED_PAGE_SIZE,
    last: lastRow ? { at: lastRow.created_at, id: lastRow.id } : null,
  });
}

/** A primeira página do feed, que o Início desenha no servidor. */
export async function getFeedFirstPage(viewerId: string): Promise<FeedPage> {
  "use cache: private";
  cacheLife("minutes");
  cacheTag(`feed:${viewerId}`);
  return readFeedPage(await createClient(), null);
}
