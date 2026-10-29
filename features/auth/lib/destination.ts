import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Route } from "next";
import { cookies } from "next/headers";
import {
  SHELF_VIEW_COOKIE,
  SHELF_VIEW_COOKIE_MAX_AGE,
  shelfViewOf,
} from "@/features/shelf/lib/view";
import { safeNextPath } from "@/lib/auth-redirect";
import { routes } from "@/lib/routes";
import type { Database } from "@/lib/supabase/database.types";

/**
 * As preferências guardadas no perfil valem neste aparelho a partir de agora:
 * a vista da estante escolhida em outro lugar reescreve o cookie.
 */
async function applySavedPreferences(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data } = await supabase
    .from("profile_preferences")
    .select("preferences")
    .eq("profile_id", userId)
    .maybeSingle();
  const preferences = data?.preferences;
  const saved =
    preferences &&
    typeof preferences === "object" &&
    !Array.isArray(preferences)
      ? preferences.shelfView
      : null;
  const view = typeof saved === "string" ? shelfViewOf(saved) : null;
  if (!view) return;
  (await cookies()).set(SHELF_VIEW_COOKIE, view, {
    path: "/",
    maxAge: SHELF_VIEW_COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}

/**
 * Para onde vai quem acabou de entrar: quem não terminou o onboarding volta
 * para ele; os outros, para o `next` (só caminhos do site) ou o /inicio. As
 * preferências do perfil passam para o cookie no caminho.
 */
export async function destinationAfterSignIn(
  supabase: SupabaseClient<Database>,
  userId: string,
  next: string | null | undefined,
): Promise<Route> {
  const [{ data }] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", userId)
      .maybeSingle(),
    applySavedPreferences(supabase, userId),
  ]);
  if (!data?.onboarded_at) return routes.onboarding;
  // safeNextPath só devolve caminho do próprio site
  return safeNextPath(next, routes.inicio) as Route;
}
