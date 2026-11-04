import "server-only";
import { createPublicClient } from "@/lib/supabase/public";
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Quem entrou só pelo Google ou por link mágico confirma entrando de novo. */
const RECENT_SIGN_IN_MS = 10 * 60 * 1000;

export type Confirmation =
  { ok: true } | { ok: false; error: string; field?: "current" };

/**
 * Confere que é a própria pessoa antes de trocar a senha ou excluir a conta:
 * uma sessão esquecida aberta não basta. Com senha, a senha atual, testada
 * num cliente à parte (a sessão do teste sai na hora). Sem senha, a entrada
 * tem de ser recente: o `amr` do token guarda quando ela entrou.
 */
export async function confirmIdentity(
  supabase: ServerClient,
  password: string | undefined,
): Promise<Confirmation> {
  const [{ data: claims }, { data: hasPassword }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.rpc("viewer_has_password"),
  ]);
  const email = claims?.claims.email;

  if (hasPassword) {
    if (!password) {
      return { ok: false, error: "Digite sua senha atual.", field: "current" };
    }
    if (!email) return { ok: false, error: "Não deu para confirmar agora." };
    const probe = createPublicClient();
    const { error } = await probe.auth.signInWithPassword({ email, password });
    if (error) {
      return {
        ok: false,
        field: "current",
        error:
          error.code === "over_request_rate_limit"
            ? "Muitas tentativas seguidas. Espere alguns minutos."
            : "A senha atual não confere.",
      };
    }
    await probe.auth.signOut({ scope: "local" }).catch(() => undefined);
    return { ok: true };
  }

  const methods = (claims?.claims.amr ?? []) as { timestamp?: number }[];
  const lastSignIn = Math.max(
    0,
    ...methods.map((method) => (method.timestamp ?? 0) * 1000),
  );
  if (Date.now() - lastSignIn > RECENT_SIGN_IN_MS) {
    return {
      ok: false,
      error: "Por segurança, saia e entre de novo na conta para continuar.",
    };
  }
  return { ok: true };
}
