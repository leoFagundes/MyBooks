import { z } from "zod";
import {
  buildAccountExport,
  shelfToGoodreadsCsv,
} from "@/features/profile/lib/export";
import { createClient } from "@/lib/supabase/server";

const formatSchema = z.enum(["json", "csv"]);

// "Exportar meus dados" (spec §5.10): tudo em JSON, ou a estante em CSV no
// formato do Goodreads. Leitura por GET, como as outras do cliente; o
// navegador baixa o anexo
export async function GET(request: Request) {
  const format = formatSchema.safeParse(
    new URL(request.url).searchParams.get("formato") ?? "json",
  );
  if (!format.success) {
    return Response.json({ error: "Formato inválido" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId)
    return Response.json({ error: "Entre na conta" }, { status: 401 });

  try {
    const data = await buildAccountExport(supabase, userId);
    const name = `mybooks-${data.profile.username}-${data.exportedAt.slice(0, 10)}`;
    const headers = { "Cache-Control": "private, no-store" };
    if (format.data === "csv") {
      // O BOM faz o Excel abrir os acentos certos
      return new Response(`\uFEFF${shelfToGoodreadsCsv(data.shelf)}`, {
        headers: {
          ...headers,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${name}.csv"`,
        },
      });
    }
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        ...headers,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}.json"`,
      },
    });
  } catch {
    return Response.json(
      { error: "Não deu para juntar seus dados agora" },
      { status: 502 },
    );
  }
}
