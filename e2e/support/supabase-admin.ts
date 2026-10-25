import { randomUUID } from "node:crypto";
import type { Cookie } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Só no Node dos testes: a chave secreta cria e apaga contas e nunca chega ao
// navegador. As variáveis vêm do .env.local (playwright.config.ts).

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta ${name} no .env.local`);
  return value;
}

export function adminClient() {
  return createClient<Database>(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export type TestUser = {
  id: string;
  email: string;
  password: string;
  username: string;
};

/** Conta nova e confirmada. Apague no fim do teste com deleteTestUser. */
export async function createTestUser(
  options: {
    username?: string;
    displayName?: string;
    onboarded?: boolean;
  } = {},
): Promise<TestUser> {
  const suffix = randomUUID().slice(0, 8);
  const email = `e2e-${suffix}@example.com`;
  const password = `Senha-${randomUUID()}`;
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username: options.username ?? `e2e_${suffix}`,
      full_name: options.displayName,
    },
  });
  if (error || !data.user)
    throw error ?? new Error("Conta de teste não criada");

  if (options.onboarded) {
    const { error: updateError } = await admin
      .from("profiles")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", data.user.id);
    if (updateError) throw updateError;
  }
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("username")
    .eq("id", data.user.id)
    .single();
  if (profileError) throw profileError;
  return { id: data.user.id, email, password, username: profile.username };
}

export async function deleteTestUser(id: string) {
  const { error } = await adminClient().auth.admin.deleteUser(id);
  if (error) throw error;
}

const BASE64_PREFIX = "base64-";
// Mesmo limite do @supabase/ssr (MAX_CHUNK_SIZE); base64url não tem
// caractere que precise de escape, então cortar a string basta
const CHUNK_SIZE = 3180;

function joinChunks(cookies: Map<string, string>, key: string) {
  if (cookies.has(key)) return cookies.get(key) ?? "";
  let value = "";
  for (let i = 0; cookies.has(`${key}.${i}`); i++)
    value += cookies.get(`${key}.${i}`);
  return value;
}

/** A mesma sessão, mas vencida: a próxima leitura obriga o proxy a renovar. */
function expire(cookies: Map<string, string>) {
  const key = [...cookies.keys()]
    .map((name) => name.replace(/\.\d+$/, ""))
    .find((name) => /^sb-[a-z0-9]+-auth-token$/.test(name));
  if (!key) throw new Error("Cookie de sessão não encontrado");
  const raw = joinChunks(cookies, key);
  const session = JSON.parse(
    Buffer.from(raw.slice(BASE64_PREFIX.length), "base64url").toString("utf8"),
  ) as { expires_at: number };
  session.expires_at = Math.floor(Date.now() / 1000) - 60;
  const value =
    BASE64_PREFIX + Buffer.from(JSON.stringify(session)).toString("base64url");

  const result = new Map(
    [...cookies].filter(([name]) => name.replace(/\.\d+$/, "") !== key),
  );
  if (value.length <= CHUNK_SIZE) {
    result.set(key, value);
  } else {
    for (let i = 0; i * CHUNK_SIZE < value.length; i++) {
      result.set(
        `${key}.${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      );
    }
  }
  return result;
}

/**
 * Cookies de sessão como o @supabase/ssr grava depois de entrar com senha,
 * prontos para context.addCookies. Com `expired`, a sessão chega vencida.
 */
export async function sessionCookies(
  user: TestUser,
  { url, expired = false }: { url: string; expired?: boolean },
): Promise<Cookie[]> {
  const jar = new Map<string, string>();
  const supabase = createServerClient<Database>(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll(cookies) {
          for (const { name, value } of cookies) {
            if (value) jar.set(name, value);
            else jar.delete(name);
          }
        },
      },
    },
  );
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw error;

  const cookies = expired ? expire(jar) : jar;
  const { hostname } = new URL(url);
  return [...cookies].map(([name, value]) => ({
    name,
    value,
    domain: hostname,
    path: "/",
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }));
}
