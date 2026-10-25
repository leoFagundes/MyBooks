import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Route } from "next";
import { safeNextPath } from "@/lib/auth-redirect";
import { routes } from "@/lib/routes";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Para onde vai quem acabou de entrar: quem não terminou o onboarding volta
 * para ele; os outros, para o `next` (só caminhos do site) ou o /inicio.
 */
export async function destinationAfterSignIn(
  supabase: SupabaseClient<Database>,
  userId: string,
  next: string | null | undefined,
): Promise<Route> {
  const { data } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", userId)
    .maybeSingle();
  if (!data?.onboarded_at) return routes.onboarding;
  // safeNextPath só devolve caminho do próprio site
  return safeNextPath(next, routes.inicio) as Route;
}
