import { readWantList } from "@/features/shelf/queries";
import { createClient } from "@/lib/supabase/server";

// A fila de Quero ler de quem está vendo, para o sorteio aberto pelo ⌘K.
// Leitura por GET, não por Server Action: o cliente despacha actions uma por
// vez
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return Response.json({ books: [] }, { status: 401 });
  try {
    const books = await readWantList(supabase, userId);
    return Response.json(
      { books },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ books: [] }, { status: 502 });
  }
}
