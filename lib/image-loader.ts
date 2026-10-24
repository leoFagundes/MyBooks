"use client";

// Loader global do next/image (next.config.ts). Nada passa pelo otimizador da
// Vercel: as capas da Open Library já vêm em três tamanhos (S 38px, M 180px,
// L 333px de largura) e o loader escolhe o menor que cobre a largura pedida.
// A largura vai sempre na URL: assim o next/image vê que ela é respeitada.

const OPEN_LIBRARY_COVER =
  /^(https:\/\/covers\.openlibrary\.org\/b\/(?:id|isbn|olid)\/[^/?#]+?)-[SML]\.jpg$/;

type LoaderParams = { src: string; width: number; quality?: number };

function withWidth(url: string, width: number) {
  return `${url}${url.includes("?") ? "&" : "?"}w=${width}`;
}

export default function imageLoader({ src, width }: LoaderParams) {
  const cover = OPEN_LIBRARY_COVER.exec(src);
  if (!cover) return withWidth(src, width);
  const size = width <= 38 ? "S" : width <= 180 ? "M" : "L";
  return withWidth(`${cover[1]}-${size}.jpg`, width);
}
