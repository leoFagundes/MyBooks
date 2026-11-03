import { z } from "zod";
import { getStaff, getUserSummary } from "@/features/admin/queries";

// O perfil resumido de alguém no painel, para quem modera
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/admin/users/[id]">,
) {
  if (!(await getStaff())) return Response.json({}, { status: 404 });
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return Response.json({}, { status: 404 });
  try {
    const summary = await getUserSummary(id.data);
    if (!summary) return Response.json({}, { status: 404 });
    return Response.json(summary, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({}, { status: 502 });
  }
}
