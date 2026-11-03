import { z } from "zod";
import { searchCollections } from "@/features/collections/queries";
import {
  followStates,
  readerState,
  searchReaders,
} from "@/features/social/queries";
import { createClient } from "@/lib/supabase/server";

const tabSchema = z.enum(["leitores", "colecoes"]);
const headers = { "Cache-Control": "private, no-store" };

// A busca do Explorar em Leitores e Coleções, uma aba por vez (Livros usa a
// busca da paleta, /api/books/search). Leitura por GET, não por Server
// Action: o cliente despacha actions uma por vez, e a busca anda a cada letra
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tab = tabSchema.safeParse(params.get("aba"));
  const query = (params.get("q") ?? "").trim().slice(0, 100);
  if (!tab.success) return Response.json({}, { status: 400 });
  if (query.length < 2) return Response.json({}, { headers });
  try {
    if (tab.data === "colecoes") {
      return Response.json(
        { collections: await searchCollections(query) },
        { headers },
      );
    }
    const readers = await searchReaders(query);
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const viewerId = data?.claims.sub ?? null;
    const states = viewerId
      ? await followStates(
          supabase,
          viewerId,
          readers.map((reader) => reader.id),
        )
      : {};
    return Response.json(
      {
        readers: readers.map((reader) => ({
          ...reader,
          state: readerState(reader.id, viewerId, states),
        })),
      },
      { headers },
    );
  } catch {
    return Response.json({}, { status: 502 });
  }
}
