import { z } from "zod";
import { readFollowList } from "@/features/social/queries";
import { createClient } from "@/lib/supabase/server";

const LISTS = { seguidores: "followers", seguindo: "following" } as const;
const listSchema = z.enum(["seguidores", "seguindo"]);

// Seguidores e seguindo do perfil. Leitura por GET, não por Server Action:
// o cliente despacha actions uma por vez. Perfil privado: só para a pessoa
// e para quem ela aceitou, como a estante
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/readers/[id]/follows">,
) {
  const id = z.uuid().safeParse((await params).id);
  const list = listSchema.safeParse(
    new URL(request.url).searchParams.get("lista"),
  );
  if (!id.success || !list.success) {
    return Response.json({ readers: [] }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const viewerId = claims?.claims.sub ?? null;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_private")
      .eq("id", id.data)
      .maybeSingle();
    if (!profile) return Response.json({ readers: [] }, { status: 404 });
    if (profile.is_private && viewerId !== id.data) {
      const { data: follow } = viewerId
        ? await supabase
            .from("follows")
            .select("status")
            .eq("follower_id", viewerId)
            .eq("following_id", id.data)
            .maybeSingle()
        : { data: null };
      if (follow?.status !== "accepted") {
        return Response.json({ readers: [] }, { status: 403 });
      }
    }
    const readers = await readFollowList(
      supabase,
      id.data,
      LISTS[list.data],
      viewerId,
    );
    return Response.json(
      { readers },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ readers: [] }, { status: 502 });
  }
}
