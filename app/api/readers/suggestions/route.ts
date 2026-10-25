import { getSuggestedReaders } from "@/features/social/queries";

// Leitura por GET, não por Server Action: o cliente despacha actions uma por
// vez, e a lista não pode esperar o "Seguir" de alguém terminar
export async function GET() {
  try {
    const readers = await getSuggestedReaders();
    return Response.json(
      { readers },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ readers: [] }, { status: 502 });
  }
}
