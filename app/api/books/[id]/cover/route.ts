import { z } from "zod";
import { COVER_FILES } from "@/features/books/lib/cover";
import { OPEN_LIBRARY_USER_AGENT } from "@/features/books/lib/open-library";
import { getBook } from "@/features/books/queries";

const SIZES = ["S", "M", "L"] as const;
type Size = (typeof SIZES)[number];
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;

const OPEN_LIBRARY_COVER =
  /^(https:\/\/covers\.openlibrary\.org\/b\/.+)-[SML]\.jpg$/;
const BUCKET_COVER = /\/storage\/v1\/object\/public\/covers\/[0-9a-f/-]+$/;

/** O arquivo do tamanho pedido: no bucket, S, M ou L.webp; na Open Library, -S, -M ou -L. */
function coverFile(coverUrl: string, size: Size) {
  if (BUCKET_COVER.test(coverUrl)) {
    const file = COVER_FILES.find((candidate) => candidate.name === size);
    return file ? `${coverUrl}/${file.name}.webp` : null;
  }
  const openLibrary = OPEN_LIBRARY_COVER.exec(coverUrl);
  // Sem capa, a Open Library responde 404 em vez de um GIF de 1px
  return openLibrary ? `${openLibrary[1]}-${size}.jpg?default=false` : null;
}

// A capa do livro pela mesma origem, para o WebGL: imagem de outra origem só
// vira textura com CORS, e a Open Library nem sempre manda. Só serve a capa de
// um livro do catálogo, nunca um endereço qualquer. O `v` da URL muda quando a
// imagem do livro muda, então a resposta pode ficar em cache por uma semana
export async function GET(
  request: Request,
  { params }: RouteContext<"/api/books/[id]/cover">,
) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return new Response(null, { status: 400 });
  const size = z
    .enum(SIZES)
    .catch("L")
    .parse(new URL(request.url).searchParams.get("tamanho"));

  const book = await getBook(id.data);
  const file = book?.coverUrl ? coverFile(book.coverUrl, size) : null;
  if (!file) return new Response(null, { status: 404 });

  try {
    const response = await fetch(file, {
      headers: { "User-Agent": OPEN_LIBRARY_USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const type = response.headers.get("Content-Type") ?? "";
    if (!response.ok || !type.startsWith("image/")) {
      return new Response(null, { status: 404 });
    }
    const body = await response.arrayBuffer();
    if (body.byteLength === 0 || body.byteLength > MAX_BYTES) {
      return new Response(null, { status: 404 });
    }
    return new Response(body, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
