import type { NextRequest } from "next/server";
import {
  RESERVED_USERNAMES,
  type UsernameAvailability,
} from "@/features/profile/lib/username";
import { usernameSchema } from "@/features/profile/schemas";
import { createClient } from "@/lib/supabase/server";

const answer = (status: UsernameAvailability) =>
  Response.json(
    { status },
    { headers: { "Cache-Control": "private, no-store" } },
  );

// O @ está livre? Confere enquanto a pessoa digita (com debounce); quem
// garante de verdade é o unique do banco, no salvar
export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username") ?? "";
  if (!usernameSchema.safeParse(username).success) {
    return answer(
      RESERVED_USERNAMES.includes(username) ? "reserved" : "invalid",
    );
  }
  const supabase = await createClient();
  const [{ data: claims }, { data: owner }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle(),
  ]);
  if (!owner) return answer("available");
  return answer(owner.id === claims?.claims.sub ? "yours" : "taken");
}
