import { type NextRequest, NextResponse } from "next/server";
import { parseSettings } from "@/features/admin/lib/settings";
import { authRedirect } from "@/lib/auth-redirect";
import { carryAuth, updateSession } from "@/lib/supabase/proxy";

type Supabase = Awaited<ReturnType<typeof updateSession>>["supabase"];

// Abertas mesmo em manutenção: o painel (para desligar), entrar e os
// retornos do login, as rotas de dados e a própria página do aviso
const OPEN_IN_MAINTENANCE = [
  "/admin",
  "/entrar",
  "/auth",
  "/api",
  "/manutencao",
  "/sem-conexao",
  "/robots.txt",
  "/sitemap.xml",
];
// O modo manutenção é lido do banco no máximo a cada 30s, por instância
const SETTINGS_TTL_MS = 30_000;
let maintenance: { on: boolean; at: number } | null = null;

const matches = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

async function maintenanceOn(supabase: Supabase) {
  if (maintenance && Date.now() - maintenance.at < SETTINGS_TTL_MS) {
    return maintenance.on;
  }
  const { data, error } = await supabase
    .from("site_settings")
    .select("key, value")
    .eq("key", "maintenance");
  // Sem resposta do banco, o site segue aberto
  const on = !error && parseSettings(data).maintenance.enabled;
  maintenance = { on, at: Date.now() };
  return on;
}

async function isStaff(supabase: Supabase) {
  const { data } = await supabase.rpc("is_moderator");
  return data === true;
}

/**
 * Renova a sessão do Supabase em toda navegação e manda cada pessoa para o
 * lugar certo. Não é a barreira de segurança (essa é a RLS e o
 * requireViewer nas actions); só evita telas que não fazem sentido. No
 * /admin é a primeira das três camadas (com o layout e cada action): sem
 * conta, vai ao /entrar; sem papel, 404. Em manutenção, quem não é da
 * equipe vê o aviso.
 */
export async function proxy(request: NextRequest) {
  const { response, userId, supabase } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (matches(pathname, "/admin")) {
    if (!userId) {
      return carryAuth(
        response,
        NextResponse.redirect(
          new URL(
            `/entrar?next=${encodeURIComponent(`${pathname}${search}`)}`,
            request.url,
          ),
        ),
      );
    }
    if (!(await isStaff(supabase))) {
      // Um caminho que não existe: a página 404 de sempre
      return carryAuth(
        response,
        NextResponse.rewrite(new URL("/_nao-encontrado", request.url)),
      );
    }
    return response;
  }

  if (
    !OPEN_IN_MAINTENANCE.some((route) => matches(pathname, route)) &&
    (await maintenanceOn(supabase)) &&
    !(userId && (await isStaff(supabase)))
  ) {
    return carryAuth(
      response,
      NextResponse.rewrite(new URL("/manutencao", request.url)),
    );
  }

  // Quando o endereço de retorno não está na lista do Supabase, o código do
  // login (Google, link mágico) cai na raiz: ele segue para a troca
  if (pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const callback = new URL("/auth/callback", request.url);
    callback.search = search;
    return carryAuth(response, NextResponse.redirect(callback));
  }

  const target = authRedirect(`${pathname}${search}`, userId !== null);
  if (!target) return response;
  return carryAuth(
    response,
    NextResponse.redirect(new URL(target, request.url)),
  );
}

export const config = {
  // Fora: arquivos do Next, imagens e as capas de exemplo em public/
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|capas/|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
