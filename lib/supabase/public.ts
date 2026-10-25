import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";
import type { Database } from "./database.types";

/** Sem sessão: leituras públicas, inclusive dentro de 'use cache'. */
export function createPublicClient() {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  return createClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
