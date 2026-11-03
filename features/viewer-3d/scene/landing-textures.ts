import {
  CanvasTexture,
  Color,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";
import { bookColor, PAPER_RGB } from "@/features/books/lib/color";
import type { BookVisual } from "@/features/books/types";
import { drawGeneratedCover, drawPageEdges, drawSpine } from "../lib/book-art";
import { loadCanvasFonts } from "../lib/canvas-text";
import type { BookDimensions } from "../lib/dimensions";
import type { BookSurfaces } from "./book-model";
import { loadCoverImage } from "./book-textures";

// Na landing os livros são pequenos e muitos: capa M, lombada de 512px, a
// capa desenhada com 256px e uma borda de folhas para todos
const COVER_ART_WIDTH = 256;
const SPINE_HEIGHT = 512;
// Quanto da espessura do miolo cabe num ladrilho da borda das folhas, num
// livro de 3 unidades (o do visualizador)
const EDGE_TILE = 0.18;

function canvasTexture(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** A borda das folhas com o ladrilho na escala deste livro (a imagem é a mesma). */
function edgeFor(edge: Texture, dims: BookDimensions, vertical: boolean) {
  const texture = edge.clone();
  const tiles = dims.pagesDepth / (EDGE_TILE * (dims.height / 3));
  if (vertical) {
    texture.wrapS = RepeatWrapping;
    texture.repeat.set(tiles, 1);
  } else {
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(1, tiles);
  }
  texture.needsUpdate = true;
  return texture;
}

export type LandingBookSurfaces = {
  surfaces: BookSurfaces;
  dispose: () => void;
};

/**
 * As superfícies de cada livro da landing, pequenas: a capa no tamanho M pela
 * rota da mesma origem (ou a desenhada, se faltar ou falhar), a lombada
 * desenhada e a cor do livro no verso, que a landing nunca mostra.
 */
export async function loadLandingSurfaces(
  books: BookVisual[],
  dims: BookDimensions[],
): Promise<LandingBookSurfaces[]> {
  await loadCanvasFonts();
  const top = canvasTexture(drawPageEdges("landing"));
  const side = canvasTexture(drawPageEdges("landing", true));
  const paper = new Color().setRGB(
    PAPER_RGB[0] / 255,
    PAPER_RGB[1] / 255,
    PAPER_RGB[2] / 255,
    SRGBColorSpace,
  );

  return Promise.all(
    books.map(async (book, index) => {
      const size = dims[index] as BookDimensions;
      const cover =
        (await loadCoverImage(book, "M")) ??
        canvasTexture(drawGeneratedCover(book, COVER_ART_WIDTH));
      const spine = canvasTexture(drawSpine(book, size, SPINE_HEIGHT));
      const pagesTop = edgeFor(top, size, false);
      const pagesSide = edgeFor(side, size, true);
      const coverColor = new Color(bookColor(book));
      return {
        surfaces: {
          cover,
          back: null,
          spine,
          pagesTop,
          pagesSide,
          coverColor,
          endpaper: coverColor.clone().lerp(paper, 0.65),
          paper,
        },
        dispose: () => {
          for (const texture of [cover, spine, pagesTop, pagesSide]) {
            texture.dispose();
          }
        },
      };
    }),
  );
}
