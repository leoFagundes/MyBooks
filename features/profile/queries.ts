import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getPublicEnv } from "@/lib/env";
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
