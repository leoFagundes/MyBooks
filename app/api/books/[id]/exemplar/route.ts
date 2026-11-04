import { z } from "zod";
import { EMPTY_COPY } from "@/features/viewer-3d/lib/copy";
import { getBookCopy } from "@/features/viewer-3d/queries";

// O "seu exemplar" no livro em 3D: a estante, as citações e o ex-libris de
// quem vê, quem mais guardou cada trecho, o fórum e a leitura pública. Por
// GET, não por Server Action: o cliente despacha actions uma por vez
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/books/[id]/exemplar">,
) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return Response.json(EMPTY_COPY, { status: 400 });
  try {
    return Response.json(await getBookCopy(id.data), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json(EMPTY_COPY, { status: 502 });
  }
}
