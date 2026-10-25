import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { redirect } from "next/navigation";
import { avatarSrc } from "@/features/profile/lib/avatar";
import { getPublicEnv } from "@/lib/env";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  onboarded: boolean;
};

/**
 * Quem está vendo, ou null. O getClaims verifica o JWT com a chave pública
 * do projeto; o cache privado fica só no navegador e reaproveita a leitura
 * entre os componentes da mesma página.
 */
export async function getViewer(): Promise<Viewer | null> {
  "use cache: private";
  cacheLife("minutes");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims.sub;
  if (!id) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, onboarded_at")
    .eq("id", id)
    .maybeSingle();
  if (!profile) return null;

  cacheTag(`profile:${profile.username}`);
  return {
    id,
    username: profile.username,
    displayName: profile.display_name ?? profile.username,
    avatarUrl: avatarSrc(profile.avatar_url, getPublicEnv().supabaseUrl),
    onboarded: profile.onboarded_at !== null,
  };
}

/** Para Server Actions e páginas que exigem conta: sem sessão, vai ao /entrar. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(routes.entrar);
  return viewer;
}
