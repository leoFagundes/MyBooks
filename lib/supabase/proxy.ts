import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getPublicEnv } from "@/lib/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const CACHE_HEADERS = ["cache-control", "expires", "pragma"];

/**
 * Resposta que segue para a página com a sessão renovada: o pedido ganha os
 * cookies novos (a página já os lê) e a resposta, os cookies e os cabeçalhos
 * que proíbem CDN de guardar a sessão de uma pessoa e servir para outra.
 */
export function nextWithAuth(
  request: NextRequest,
  cookiesToSet: CookieToSet[],
  headers: Record<string, string>,
): NextResponse {
  for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
  const response = NextResponse.next({ request });
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options);
  }
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

/** Leva cookies e bloqueio de cache da resposta renovada para um redirecionamento. */
export function carryAuth(from: NextResponse, to: NextResponse): NextResponse {
  for (const cookie of from.cookies.getAll()) to.cookies.set(cookie);
  for (const key of CACHE_HEADERS) {
    const value = from.headers.get(key);
    if (value) to.headers.set(key, value);
  }
  return to;
}

/** Renova a sessão no proxy e diz quem está vendo (id ou null), com o cliente. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        response = nextWithAuth(request, cookiesToSet, headers);
      },
    },
  });

  // Antes de montar qualquer resposta: é aqui que o token vencido é renovado
  const { data } = await supabase.auth.getClaims();
  return { response, userId: data?.claims.sub ?? null, supabase };
}
