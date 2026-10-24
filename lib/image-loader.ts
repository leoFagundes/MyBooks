"use client";

// Loader global do next/image (next.config.ts). Nada passa pelo otimizador da
// Vercel: as capas da Open Library já vêm em três tamanhos (S 38px, M 180px,
// L 333px de largura) e o loader escolhe o menor que cobre a largura pedida.
// Sem capa, a Open Library responde 200 com um GIF transparente de 1px; com
// default=false ela responde 404, o onError dispara e a capa tipográfica entra.

const OPEN_LIBRARY_COVER =
  /^(https:\/\/covers\.openlibrary\.org\/b\/(?:id|isbn|olid)\/[^/?#]+?)-[SML]\.jpg$/;

type LoaderParams = { src: string; width: number; quality?: number };

// Outras origens levam a largura na URL só para o next/image ver que o loader
// a respeita (sem isso ele avisa no console)
function withWidth(url: string, width: number) {
  return `${url}${url.includes("?") ? "&" : "?"}w=${width}`;
}

export default function imageLoader({ src, width }: LoaderParams) {
  const cover = OPEN_LIBRARY_COVER.exec(src);
  if (!cover) return withWidth(src, width);
  const size = width <= 38 ? "S" : width <= 180 ? "M" : "L";
  // Uma URL por tamanho, e não por largura, para o cache do navegador valer
  return `${cover[1]}-${size}.jpg?default=false`;
}
