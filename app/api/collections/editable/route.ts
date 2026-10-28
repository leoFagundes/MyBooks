import { readEditableCollections } from "@/features/collections/queries";
import { createClient } from "@/lib/supabase/server";

// As coleções em que quem está vendo pode pôr livros (o campo "Coleção" da
// paleta). Leitura por GET, não por Server Action: o cliente despacha
// actions uma por vez
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) {
    return Response.json({ collections: [] }, { status: 401 });
  }
  try {
    const collections = await readEditableCollections(supabase, userId);
    return Response.json(
      { collections },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ collections: [] }, { status: 502 });
  }
}
