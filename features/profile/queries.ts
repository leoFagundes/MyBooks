import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getViewer } from "@/lib/auth";
import { getPublicEnv } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { avatarSrc } from "./lib/avatar";

export type OwnProfile = {
  id: string;
  username: string;
  /** Vazio quando a pessoa ainda não disse o nome (o cadastro por e-mail). */
  displayName: string;
  avatarUrl: string | null;
  favoriteGenres: string[];
};

/** O perfil de quem está vendo, como o onboarding precisa. */
export async function getOwnProfile(
  userId: string,
): Promise<OwnProfile | null> {
  "use cache: private";
  cacheLife("minutes");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, favorite_genres")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;

  cacheTag(`profile:${data.username}`);
  return {
    id: userId,
    username: data.username,
    displayName: data.display_name ?? "",
    avatarUrl: avatarSrc(data.avatar_url, getPublicEnv().supabaseUrl),
    favoriteGenres: data.favorite_genres,
  };
}

const USERNAME = /^[a-z0-9_]{3,20}$/;

export type ProfileSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  favoriteGenres: string[];
  isPrivate: boolean;
};

/** O perfil pelo @: o cabeçalho, que aparece até em perfil privado. */
export async function getProfileByUsername(
  username: string,
): Promise<ProfileSummary | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`profile:${username}`);
  if (!USERNAME.test(username)) return null;

  const { data, error } = await createPublicClient()
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, bio, favorite_genres, is_private",
    )
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name?.trim() || data.username,
    avatarUrl: avatarSrc(data.avatar_url, getPublicEnv().supabaseUrl),
    bio: data.bio,
    favoriteGenres: data.favorite_genres,
    isPrivate: data.is_private,
  };
}

/** O perfil a partir do @ da URL: "/@Ana" acha a ana. */
export async function getProfileFromParam(
  param: string,
): Promise<ProfileSummary | null> {
  let username: string;
  try {
    username = decodeURIComponent(param).toLowerCase();
  } catch {
    return null;
  }
  return getProfileByUsername(username);
}

export type ProfileCounts = {
  books: number;
  collections: number;
  followers: number;
  following: number;
};

/**
 * Os contadores do cabeçalho (profile_counts, no banco). O dono conta também
 * as coleções privadas, por isso a leitura é com a sessão. Sem resposta,
 * null: o cabeçalho aparece sem eles.
 */
export async function getProfileCounts(
  profile: Pick<ProfileSummary, "id" | "username">,
): Promise<ProfileCounts | null> {
  "use cache: private";
  cacheLife("minutes");
  cacheTag(`profile:${profile.username}`, `shelf:${profile.id}`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("profile_counts", { profile_id: profile.id })
    .single();
  return error ? null : data;
}

/** Quem está vendo diante do perfil: o dono, quem segue, quem pediu… */
export type ProfileRelation =
  "self" | "following" | "requested" | "none" | "visitor";

export async function getProfileRelation(
  profile: Pick<ProfileSummary, "id" | "username">,
): Promise<ProfileRelation> {
  "use cache: private";
  cacheLife("minutes");
  // Seguir e deixar de seguir atualizam o perfil das duas pessoas
  cacheTag(`profile:${profile.username}`);

  const viewer = await getViewer();
  if (!viewer) return "visitor";
  if (viewer.id === profile.id) return "self";
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_id", viewer.id)
    .eq("following_id", profile.id)
    .maybeSingle();
  if (!data) return "none";
  return data.status === "accepted" ? "following" : "requested";
}

/** O perfil de uma aba e se quem está vendo pode ver o conteúdo dela. */
export async function getProfileTab(param: string) {
  const profile = await getProfileFromParam(param);
  if (!profile) return null;
  const relation = await getProfileRelation(profile);
  return { profile, relation, visible: canSeeContent(profile, relation) };
}

/** Estante, coleções e citações: de todos, ou só de quem segue (perfil privado). */
export function canSeeContent(
  profile: Pick<ProfileSummary, "isPrivate">,
  relation: ProfileRelation,
) {
  return !profile.isPrivate || relation === "self" || relation === "following";
}
