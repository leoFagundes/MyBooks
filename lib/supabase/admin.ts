import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Com a chave secreta, sem RLS: só para o que o servidor faz em nome do app
 * (livros de fora no catálogo e as capas no bucket covers). Nunca com dado
 * que não foi conferido no servidor.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new Error("Falta SUPABASE_SECRET_KEY");
  return createClient<Database>(getPublicEnv().supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
