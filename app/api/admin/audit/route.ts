import { z } from "zod";
import { getAuditPage, getStaff } from "@/features/admin/queries";

const paramsSchema = z.object({
  acao: z.string().trim().max(60).nullable().catch(null),
  pagina: z.coerce.number().int().min(0).max(10_000).catch(0),
  tamanho: z.coerce.number().int().min(5).max(100).catch(25),
});

// A auditoria do painel, uma página por vez. Só o admin
export async function GET(request: Request) {
  const staff = await getStaff();
  if (staff?.role !== "admin") return Response.json({}, { status: 404 });
  const params = new URL(request.url).searchParams;
  const { acao, pagina, tamanho } = paramsSchema.parse({
    acao: params.get("acao") || null,
    pagina: params.get("pagina") ?? undefined,
    tamanho: params.get("tamanho") ?? undefined,
  });
  try {
    const page = await getAuditPage({
      action: acao,
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
