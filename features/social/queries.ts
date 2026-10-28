import "server-only";
import { avatarSrc } from "@/features/profile/lib/avatar";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  FollowState,
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
