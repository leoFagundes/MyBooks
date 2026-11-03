import { getSimilarSuggestions } from "@/features/suggestions/queries";

// Enquanto a pessoa digita o título: as sugestões parecidas (pg_trgm)
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "")
    .trim()
    .slice(0, 120);
  if (q.length < 4) return Response.json({ similar: [] });
  try {
    return Response.json({ similar: await getSimilarSuggestions(q) });
  } catch {
    return Response.json({ similar: [] }, { status: 502 });
  }
}
