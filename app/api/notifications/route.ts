import { z } from "zod";
import { NOTIFICATIONS_PAGE } from "@/features/social/lib/notifications";
import {
  readNotificationItems,
  readNotifications,
} from "@/features/social/queries";
import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "private, no-store" };

// Os avisos de quem está vendo. Leitura por GET, não por Server Action: o
// cliente despacha actions uma por vez, e o sino busca de novo a cada aviso
// que chega pelo tempo real. Com ?todas=1, uma página do "Ver todas" (e
// ?antes=<data> a partir da segunda)
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const all = params.get("todas") === "1";
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) {
    return Response.json(
      all
        ? { items: [], next: null }
        : { unread: 0, total: 0, requests: [], items: [] },
      { status: 401 },
    );
  }
  try {
    if (all) {
      const before = z.iso
        .datetime({ offset: true })
        .safeParse(params.get("antes"));
      return Response.json(
        await readNotificationItems(supabase, userId, {
          before: before.success ? before.data : null,
          limit: NOTIFICATIONS_PAGE,
        }),
        { headers },
      );
    }
    return Response.json(await readNotifications(supabase, userId), {
      headers,
    });
  } catch {
    return Response.json(
      all
        ? { items: [], next: null }
        : { unread: 0, total: 0, requests: [], items: [] },
      { status: 502 },
    );
  }
}
