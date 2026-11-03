import { z } from "zod";
import { getTopics } from "@/features/community/queries";

const paramsSchema = z.object({
  categoria: z.string().max(40).nullable().catch(null),
  ordem: z.enum(["recentes", "populares", "sem-resposta"]).catch("recentes"),
  pagina: z.coerce.number().int().min(0).max(500).catch(0),
});

// As páginas seguintes da lista do fórum ("Ver mais"). Leitura por GET: o
// cliente despacha Server Actions uma por vez
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const { categoria, ordem, pagina } = paramsSchema.parse({
    categoria: params.get("categoria") || null,
    ordem: params.get("ordem") ?? undefined,
    pagina: params.get("pagina") ?? undefined,
  });
  try {
    return Response.json(
      await getTopics({ category: categoria, sort: ordem, page: pagina }),
    );
  } catch {
    return Response.json({}, { status: 502 });
  }
}
