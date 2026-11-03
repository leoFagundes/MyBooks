"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionResult, fieldErrorsFrom } from "@/lib/action";
import { authErrorMessage } from "@/features/auth/errors";
import { requireViewer } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isFeatureOn } from "@/features/admin/queries";
import { type Genre, genreSlug } from "./lib/genre-name";
import {
  deleteAccountSchema,
  type EditProfileValues,
  editProfileSchema,
  genreNameSchema,
  genresSchema,
  type PasswordChangeValues,
  passwordChangeSchema,
  profileStepSchema,
  type ProfileStepValues,
  usernameSchema,
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
  const { error } = await supabase.rpc("set_favorite_genres", {
    slugs: parsed.data,
  });
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

/** Nome, bio, foto, gêneros e privacidade, pela gaveta "Editar perfil". */
export async function updateProfile(
  input: EditProfileValues,
): Promise<ActionResult> {
  const parsed = editProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const viewer = await requireViewer();
  const { displayName, bio, avatarPath, genres, isPrivate } = parsed.data;
  if (avatarPath && !avatarPath.startsWith(`avatars/${viewer.id}/`)) {
    return { ok: false, error: "Essa foto não é sua." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      bio,
      is_private: isPrivate,
      ...(avatarPath ? { avatar_url: avatarPath } : {}),
    })
    .eq("id", viewer.id);
  // Os favoritos moram em user_favorite_genres (o array do perfil é espelho)
  const saved = error
    ? null
    : await supabase.rpc("set_favorite_genres", { slugs: genres });
  if (error || saved?.error)
    return { ok: false, error: "Não deu para salvar agora. Tente de novo." };

  updateTag(`profile:${viewer.username}`);
  return { ok: true, data: undefined };
}

/** Quem vê a estante, pelas configurações: salva na hora. */
export async function setPrivacy(isPrivate: boolean): Promise<ActionResult> {
  const parsed = editProfileSchema.shape.isPrivate.safeParse(isPrivate);
  if (!parsed.success) return { ok: false, error: "Escolha uma das opções." };
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_private: parsed.data })
    .eq("id", viewer.id);
  if (error)
    return { ok: false, error: "Não deu para salvar agora. Tente de novo." };
  // O perfil, a estante e o que os outros veem dela
  updateTag(`profile:${viewer.username}`);
  updateTag(`shelf:${viewer.id}`);
  return { ok: true, data: undefined };
}

/** Trocar o @ (a gaveta "Editar perfil" não mexe nele). */
export async function changeUsername(
  input: string,
): Promise<ActionResult<{ username: string }>> {
  const parsed = usernameSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "@ inválido";
    return { ok: false, error: message, fieldErrors: { username: message } };
  }
  const viewer = await requireViewer();
  const username = parsed.data;
  if (username === viewer.username) return { ok: true, data: { username } };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ username })
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
  updateTag(`profile:${username}`);
  return { ok: true, data: { username } };
}

/** Senha nova (ou a primeira, para quem entrou por link mágico ou Google). */
export async function changePassword(
  input: PasswordChangeValues,
): Promise<ActionResult> {
  const parsed = passwordChangeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: authErrorMessage(error.code) };
  return { ok: true, data: undefined };
}

/**
 * Excluir a conta, com o @ digitado para confirmar. O banco apaga em cascata
 * o perfil, a estante, as citações, as coleções, quem segue e os avisos; os
 * livros que a pessoa cadastrou ficam no catálogo, sem o nome dela. A foto
 * mora no Storage e sai antes.
 */
export async function deleteAccount(input: {
  confirm: string;
}): Promise<ActionResult> {
  const viewer = await requireViewer();
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success || parsed.data.confirm !== viewer.username) {
    const message = `Digite @${viewer.username} para confirmar`;
    return { ok: false, error: message, fieldErrors: { confirm: message } };
  }

  const admin = createAdminClient();
  const { data: files } = await admin.storage.from("avatars").list(viewer.id);
  if (files && files.length > 0) {
    await admin.storage
      .from("avatars")
      .remove(files.map((file) => `${viewer.id}/${file.name}`));
  }
  const { error } = await admin.auth.admin.deleteUser(viewer.id);
  if (error) {
    return {
      ok: false,
      error: "Não deu para excluir a conta agora. Tente de novo.",
    };
  }
  // A sessão aponta para alguém que não existe mais: os cookies saem
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  updateTag(`profile:${viewer.username}`);
  updateTag(`shelf:${viewer.id}`);
  return { ok: true, data: undefined };
}

/**
 * Cria um gênero (MELHORIAS 5.4). Nasce pendente: só quem criou o vê até um
 * admin aprovar. Se já existe um com o mesmo nome (sem acento nem caixa), é
 * esse que volta, e nada se cria.
 */
export async function createGenre(
  input: unknown,
): Promise<ActionResult<Genre>> {
  const parsed = genreNameSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Nome inválido",
    };
  }
  if (!(await isFeatureOn("criar_generos"))) {
    return { ok: false, error: "Criar gêneros está desligado por enquanto." };
  }
  const viewer = await requireViewer();
  const name = parsed.data;
  const slug = genreSlug(name);
  const supabase = await createClient();
  const existing = await supabase
    .from("genres")
    .select("slug, name, status")
    .eq("slug", slug)
    .maybeSingle();
  if (existing.data) {
    return {
      ok: true,
      data: {
        slug: existing.data.slug,
        name: existing.data.name,
        pending: existing.data.status !== "approved",
      },
    };
  }
  const { error } = await supabase
    .from("genres")
    .insert({ name, slug, created_by: viewer.id });
  if (error) {
    // Outra pessoa já criou esse e ele espera aprovação: a RLS o esconde, e o
    // slug único barra o repetido
    return {
      ok: false,
      error:
        error.code === UNIQUE_VIOLATION
          ? "Esse gênero já foi sugerido e espera aprovação."
          : "Não deu para criar o gênero agora. Tente de novo.",
    };
  }
  return { ok: true, data: { slug, name, pending: true } };
}
