"use server";

import type { Route } from "next";
import { isFeatureOn } from "@/features/admin/queries";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { type ActionResult, fieldErrorsFrom } from "@/lib/action";
import { safeNextPath } from "@/lib/auth-redirect";
import { getPublicEnv } from "@/lib/env";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { authErrorMessage } from "./errors";
import { destinationAfterSignIn } from "./lib/destination";
import { magicLinkSchema, signInSchema, signUpSchema } from "./schemas";

/** Estado dos formulários de conta (useActionState); no sucesso, o e-mail usado. */
export type AuthFormState = ActionResult<{ email: string }> | null;

const INVALID = "Confira os campos destacados.";

const field = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

// O link do e-mail e o retorno do Google voltam para o endereço em que a
// pessoa está (localhost, preview ou produção); o Supabase só aceita os da
// lista de redirecionamento
async function callbackUrl(next: string) {
  const origin = (await headers()).get("origin") ?? getPublicEnv().siteUrl;
  const url = new URL("/auth/callback", origin);
  if (next) url.searchParams.set("next", safeNextPath(next, "/inicio"));
  return url.toString();
}

export async function signIn(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: INVALID,
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { ok: false, error: authErrorMessage(error?.code) };
  }
  redirect(
    await destinationAfterSignIn(
      supabase,
      data.user.id,
      field(formData, "next"),
    ),
  );
}

export async function signUp(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    email: field(formData, "email"),
    password: field(formData, "password"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: INVALID,
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  if (!(await isFeatureOn("cadastro"))) {
    return { ok: false, error: "Os cadastros estão fechados por enquanto." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: await callbackUrl("") },
  });
  if (error) return { ok: false, error: authErrorMessage(error.code) };
  // Com a confirmação de e-mail ligada, a sessão só nasce no link
  if (data.session) redirect(routes.onboarding);
  return { ok: true, data: { email: parsed.data.email } };
}

export async function sendMagicLink(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = magicLinkSchema.safeParse({ email: field(formData, "email") });
  if (!parsed.success) {
    return {
      ok: false,
      error: INVALID,
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: await callbackUrl(field(formData, "next")) },
  });
  if (error) return { ok: false, error: authErrorMessage(error.code) };
  return { ok: true, data: parsed.data };
}

// As configurações públicas do Auth dizem se o Google está ligado no projeto;
// sem isso, o botão levaria a uma página de erro em JSON do Supabase
async function googleEnabled() {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabasePublishableKey },
    });
    const settings = (await response.json()) as {
      external?: { google?: boolean };
    };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}

export async function signInWithGoogle(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!(await googleEnabled())) {
    return { ok: false, error: authErrorMessage("provider_disabled") };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: await callbackUrl(field(formData, "next")) },
  });
  if (error || !data.url) {
    return { ok: false, error: authErrorMessage(error?.code) };
  }
  // A URL de autorização do Google, montada pelo Supabase
  redirect(data.url as Route);
}

/** Sai só deste aparelho; quem chama recarrega a página inteira depois. */
export async function signOut(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) return { ok: false, error: authErrorMessage(error.code) };
  return { ok: true, data: undefined };
}
