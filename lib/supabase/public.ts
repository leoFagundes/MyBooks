import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

/** Sem sessão: leituras públicas, inclusive dentro de 'use cache'. */
export function createPublicClient() {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
