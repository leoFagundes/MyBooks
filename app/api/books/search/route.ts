import type { NextRequest } from "next/server";
import { searchBooks, type SearchScope } from "@/features/books/queries";

const SCOPES: readonly string[] = ["all", "catalog", "external"];
const isScope = (value: string | null): value is SearchScope =>
  value !== null && SCOPES.includes(value);

// Leitura por GET (o cliente despacha Server Actions uma por vez); o cache
// fica dentro do searchBooks, por consulta
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const scope = params.get("scope");
  const results = await searchBooks(
    params.get("q") ?? "",
    isScope(scope) ? scope : "all",
  );
  if (results === null) return Response.json({ results: [] }, { status: 502 });
  return Response.json({ results });
}
