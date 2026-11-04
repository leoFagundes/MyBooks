import { searchReaders } from "@/features/social/queries";

const headers = { "Cache-Control": "private, no-store" };
const USERNAME_PREFIX = /^[a-z0-9_]{1,20}$/i;

// O @ do fórum (ajustes finais): quem combina com o que vem depois do @,
// enquanto a pessoa digita. Leitura por GET: o cliente despacha actions uma
// por vez, e a lista anda a cada letra
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (!USERNAME_PREFIX.test(query)) {
    return Response.json({ readers: [] }, { headers });
  }
  try {
    const readers = (await searchReaders(query)).slice(0, 6).map((reader) => ({
      username: reader.username,
      displayName: reader.displayName,
      avatarUrl: reader.avatarUrl,
    }));
    return Response.json({ readers }, { headers });
  } catch {
    return Response.json({ readers: [] }, { status: 502 });
  }
}
