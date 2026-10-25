import "server-only";
import { avatarSrc } from "@/features/profile/lib/avatar";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { SuggestedReader } from "./types";

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
  const { supabaseUrl } = getPublicEnv();
  return data.map((reader) => ({
    id: reader.id,
    username: reader.username,
    displayName: reader.display_name ?? reader.username,
    avatarUrl: avatarSrc(reader.avatar_url, supabaseUrl),
    isPrivate: reader.is_private,
    favoriteGenres: reader.favorite_genres,
  }));
}
