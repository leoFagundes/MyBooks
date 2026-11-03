import { z } from "zod";
import { getSuggestions } from "@/features/suggestions/queries";

const paramsSchema = z.object({
  ordem: z.enum(["votadas", "recentes"]).catch("votadas"),
  status: z
    .enum([
      "nova",
      "em_analise",
      "planejada",
      "em_andamento",
      "concluida",
      "recusada",
    ])
    .nullable()
    .catch(null),
  pagina: z.coerce.number().int().min(0).max(500).catch(0),
});

// As páginas seguintes das sugestões ("Ver mais"), com o voto de quem vê
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const { ordem, status, pagina } = paramsSchema.parse({
    ordem: params.get("ordem") ?? undefined,
    status: params.get("status") || null,
    pagina: params.get("pagina") ?? undefined,
  });
  try {
    return Response.json(
      await getSuggestions({ sort: ordem, status, page: pagina }),
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch {
    return Response.json({}, { status: 502 });
  }
}
