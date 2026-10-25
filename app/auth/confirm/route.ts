import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { destinationAfterSignIn } from "@/features/auth/lib/destination";
import { createClient } from "@/lib/supabase/server";

const OTP_TYPES: readonly string[] = [
  "email",
  "magiclink",
  "signup",
  "invite",
  "recovery",
  "email_change",
] satisfies EmailOtpType[];

const isOtpType = (value: string | null): value is EmailOtpType =>
  value !== null && OTP_TYPES.includes(value);

// Link com token_hash (modelos de e-mail próprios e testes): vale até aberto
// em outro aparelho, porque não depende de cookie guardado no navegador
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (tokenHash && isOtpType(type)) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error && data.user) {
      const destination = await destinationAfterSignIn(
        supabase,
        data.user.id,
        searchParams.get("next"),
      );
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }
  return NextResponse.redirect(
    new URL("/entrar?erro=otp_expired", request.url),
  );
}
