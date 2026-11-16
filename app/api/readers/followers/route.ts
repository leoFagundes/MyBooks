import { toReader } from "@/features/social/queries";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { matchesText } from "@/lib/text-match";

const headers = { "Cache-Control": "private, no-store" };
const LIMIT = 8;

// Para quem indicar um livro: os seguidores de quem pede (só a quem segue
// você dá para indicar), filtrados pelo nome ou @. Leitura por GET: o
// cliente despacha actions uma por vez, e a lista anda a cada letra
export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ readers: [] }, { status: 401, headers });
  const query = (new URL(request.url).searchParams.get("q") ?? "")
    .replace(/^@/, "")
    .slice(0, 40);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("follows")
    .select(
      "person:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)",
    )
    .eq("following_id", viewer.id)
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return Response.json({ readers: [] }, { status: 502, headers });
  const readers = data
    .flatMap(({ person }) => (person ? [toReader(person)] : []))
    .filter(
      (reader) =>
        !query ||
        matchesText(`${reader.displayName} ${reader.username}`, query),
    )
    .slice(0, LIMIT);
  return Response.json({ readers }, { headers });
}
