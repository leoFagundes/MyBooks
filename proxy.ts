import { type NextRequest, NextResponse } from "next/server";
import { authRedirect } from "@/lib/auth-redirect";
import { carryAuth, updateSession } from "@/lib/supabase/proxy";

/**
 * Renova a sessão do Supabase em toda navegação e manda cada pessoa para o
 * lugar certo. Não é a barreira de segurança (essa é a RLS e o
 * requireViewer nas actions); só evita telas que não fazem sentido.
 */
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
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
    "/((?!_next/static|_next/image|favicon.ico|capas/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
