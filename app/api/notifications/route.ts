import { readNotifications } from "@/features/social/queries";
import { createClient } from "@/lib/supabase/server";

// Os avisos de quem está vendo. Leitura por GET, não por Server Action: o
// cliente despacha actions uma por vez, e o sino busca de novo a cada aviso
// que chega pelo tempo real
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) {
    return Response.json(
      { unread: 0, requests: [], items: [] },
      { status: 401 },
    );
  }
  try {
    return Response.json(await readNotifications(supabase, userId), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json(
      { unread: 0, requests: [], items: [] },
      { status: 502 },
    );
  }
}
