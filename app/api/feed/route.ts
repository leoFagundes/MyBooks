import { z } from "zod";
import { readFeedPage } from "@/features/social/queries";
import { createClient } from "@/lib/supabase/server";

const cursorSchema = z.object({
  at: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});

// As próximas páginas do feed (o scroll infinito do Início). Leitura por
// GET, não por Server Action: o cliente despacha actions uma por vez
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const cursor = cursorSchema.safeParse({
    at: params.get("antes"),
    id: params.get("id"),
  });
  if (!cursor.success) {
    return Response.json({ groups: [], next: null }, { status: 400 });
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) {
    return Response.json({ groups: [], next: null }, { status: 401 });
  }
  try {
    return Response.json(await readFeedPage(supabase, cursor.data), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ groups: [], next: null }, { status: 502 });
  }
}
