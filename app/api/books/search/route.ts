import type { NextRequest } from "next/server";
import { toBookVisual } from "@/features/books/lib/to-book-visual";
import { createPublicClient } from "@/lib/supabase/public";

// Busca do catálogo (o onboarding procura entre os livros do seed); a Open
// Library e o Google Books entram na Fase 3. Menos de 2 letras: lista vazia
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return Response.json({ results: [] });

  const { data, error } = await createPublicClient().rpc("search_catalog", {
    q,
    max_results: 8,
  });
  if (error) return Response.json({ results: [] }, { status: 502 });
  return Response.json({ results: data.map(toBookVisual) });
}
