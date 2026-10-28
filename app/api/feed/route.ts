import { z } from "zod";
import { readFeedPage } from "@/features/social/queries";
import { createClient } from "@/lib/supabase/server";

const cursorSchema = z.object({
  at: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});

// As páginas do feed (o scroll infinito do Início); sem cursor, a primeira,
// que o React Query pede de novo quando o dado envelhece. Leitura por GET,
// não por Server Action: o cliente despacha actions uma por vez
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const first = !params.has("antes") && !params.has("id");
  const cursor = first
    ? null
    : cursorSchema.safeParse({ at: params.get("antes"), id: params.get("id") });
  if (cursor && !cursor.success) {
    return Response.json({ groups: [], next: null }, { status: 400 });
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) {
    return Response.json({ groups: [], next: null }, { status: 401 });
  }
  try {
    return Response.json(await readFeedPage(supabase, cursor?.data ?? null), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ groups: [], next: null }, { status: 502 });
  }
}
