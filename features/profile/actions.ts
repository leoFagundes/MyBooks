"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionResult, fieldErrorsFrom } from "@/lib/action";
import { requireViewer } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import {
  genresSchema,
  profileStepSchema,
  type ProfileStepValues,
} from "./schemas";

const UNIQUE_VIOLATION = "23505";

/** Nome, @ e, quando a pessoa trocou, o caminho da foto nova no bucket. */
export async function saveProfile(
  input: ProfileStepValues,
): Promise<ActionResult<{ username: string }>> {
  const parsed = profileStepSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const viewer = await requireViewer();
  const { displayName, username, avatarPath } = parsed.data;
  if (avatarPath && !avatarPath.startsWith(`avatars/${viewer.id}/`)) {
    return { ok: false, error: "Essa foto não é sua." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      username,
      ...(avatarPath ? { avatar_url: avatarPath } : {}),
    })
    .eq("id", viewer.id);
  if (error?.code === UNIQUE_VIOLATION) {
    return {
      ok: false,
      error: "Esse @ já tem dono.",
      fieldErrors: { username: "Esse @ já tem dono" },
    };
  }
  if (error)
    return { ok: false, error: "Não deu para salvar agora. Tente de novo." };

  updateTag(`profile:${viewer.username}`);
  if (username !== viewer.username) updateTag(`profile:${username}`);
  return { ok: true, data: { username } };
}

export async function saveGenres(input: string[]): Promise<ActionResult> {
  const parsed = genresSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Gênero inválido",
    };
  }
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ favorite_genres: parsed.data })
    .eq("id", viewer.id);
  if (error) {
    return {
      ok: false,
      error: "Não deu para salvar seus gêneros. Tente de novo.",
    };
  }
  updateTag(`profile:${viewer.username}`);
  return { ok: true, data: undefined };
}

export async function finishOnboarding(): Promise<ActionResult> {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", viewer.id)
    .is("onboarded_at", null);
  if (error)
    return { ok: false, error: "Não deu para concluir agora. Tente de novo." };
  updateTag(`profile:${viewer.username}`);
  redirect(routes.inicio);
}
