import { z } from "zod";
import {
  BOOK_FILTERS,
  BOOK_SORTS,
  getBooksPage,
  getStaff,
} from "@/features/admin/queries";

const paramsSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  filtro: z.enum(BOOK_FILTERS).nullable().catch(null),
  ordem: z.enum(BOOK_SORTS).catch("created_at"),
  direcao: z.enum(["asc", "desc"]).catch("desc"),
  pagina: z.coerce.number().int().min(0).max(10_000).catch(0),
  tamanho: z.coerce.number().int().min(5).max(100).catch(20),
});

// Os livros do painel (fora da Open Library e os excluídos). Sem o papel, 404
export async function GET(request: Request) {
  if (!(await getStaff())) return Response.json({}, { status: 404 });
  const params = new URL(request.url).searchParams;
  const { q, filtro, ordem, direcao, pagina, tamanho } = paramsSchema.parse({
    q: params.get("q") ?? "",
    filtro: params.get("filtro"),
    ordem: params.get("ordem") ?? undefined,
    direcao: params.get("direcao") ?? undefined,
    pagina: params.get("pagina") ?? undefined,
    tamanho: params.get("tamanho") ?? undefined,
  });
  try {
    const page = await getBooksPage({
      q,
      filter: filtro,
      sort: ordem,
      direction: direcao,
      page: pagina,
      size: tamanho,
    });
    return Response.json(page, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({}, { status: 502 });
  }
}
