import { type NextRequest, NextResponse } from "next/server";
import { destinationAfterSignIn } from "@/features/auth/lib/destination";
import { createClient } from "@/lib/supabase/server";

// Retorno do Google e dos links do modelo de e-mail padrão do Supabase (PKCE):
// troca o código pela sessão. O verificador do código está num cookie, então
// o link precisa abrir no mesmo navegador em que foi pedido
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const failed = (code: string) =>
    NextResponse.redirect(
      new URL(`/entrar?erro=${encodeURIComponent(code)}`, request.url),
    );

  const errorCode = searchParams.get("error_code") ?? searchParams.get("error");
  if (errorCode) return failed(errorCode);

  const code = searchParams.get("code");
  if (!code) return failed("otp_expired");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return failed(error?.code ?? "otp_expired");

  const destination = await destinationAfterSignIn(
    supabase,
    data.user.id,
    searchParams.get("next"),
  );
  return NextResponse.redirect(new URL(destination, request.url));
}
