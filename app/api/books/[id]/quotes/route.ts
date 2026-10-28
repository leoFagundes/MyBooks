import { z } from "zod";
import { readBookQuotes } from "@/features/books/queries";
import { createClient } from "@/lib/supabase/server";

// Citações da comunidade para a folha de rosto do livro em 3D. Leitura por
// GET, não por Server Action: o cliente despacha actions uma por vez. Vale
// sem conta também: a RLS mostra só as de perfis que quem pede pode ver
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/books/[id]/quotes">,
) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return Response.json({ quotes: [] }, { status: 400 });
  try {
    const supabase = await createClient();
    return Response.json(
      { quotes: await readBookQuotes(supabase, id.data) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ quotes: [] }, { status: 502 });
  }
}
