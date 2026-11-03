import { z } from "zod";
import {
  getStaff,
  getUsersPage,
  USER_FILTERS,
  USER_SORTS,
} from "@/features/admin/queries";

const headers = { "Cache-Control": "private, no-store" };

const paramsSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  filtro: z.enum(USER_FILTERS).nullable().catch(null),
  ordem: z.enum(USER_SORTS).catch("created_at"),
  direcao: z.enum(["asc", "desc"]).catch("desc"),
  pagina: z.coerce.number().int().min(0).max(10_000).catch(0),
  tamanho: z.coerce.number().int().min(5).max(100).catch(20),
});

// A lista de usuários do painel (busca, filtro, ordem e página no banco).
// Sem o papel, 404: o painel não se anuncia
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
    const page = await getUsersPage({
      q,
      filter: filtro,
      sort: ordem,
      direction: direcao,
      page: pagina,
      size: tamanho,
    });
    return Response.json(page, { headers });
  } catch {
    return Response.json({}, { status: 502 });
  }
}
