import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { avatarSrc } from "@/features/profile/lib/avatar";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  Affinity,
  FollowState,
  NotificationItem,
  NotificationsPayload,
  Reader,
  ReaderState,
  SuggestedReader,
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
]);

const isNotificationType = (
  value: string,
): value is NotificationItem["type"] => NOTIFICATION_TYPES.has(value);

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
