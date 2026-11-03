import { getModerationQueues, getStaff } from "@/features/admin/queries";

// As filas da moderação, para quem modera. Sem o papel, 404
export async function GET() {
  if (!(await getStaff())) return Response.json({}, { status: 404 });
  try {
    return Response.json(await getModerationQueues(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({}, { status: 502 });
  }
}
