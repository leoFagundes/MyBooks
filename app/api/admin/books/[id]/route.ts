import { z } from "zod";
import { getAdminBookDetails, getStaff } from "@/features/admin/queries";

// Os campos de um livro para a edição no painel, para quem modera
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/admin/books/[id]">,
) {
  if (!(await getStaff())) return Response.json({}, { status: 404 });
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return Response.json({}, { status: 404 });
  const details = await getAdminBookDetails(id.data).catch(() => null);
  if (!details) return Response.json({}, { status: 404 });
  return Response.json(details, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
