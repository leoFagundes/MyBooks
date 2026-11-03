import {
  CanvasTexture,
  Color,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from "three";
import { bookColor, PAPER_RGB } from "@/features/books/lib/color";
import type { BookVisual } from "@/features/books/types";
import {
  drawBackCover,
  drawGeneratedCover,
  drawPageEdges,
  drawSpine,
} from "../lib/book-art";
import { loadCanvasFonts } from "../lib/canvas-text";
import { coverTextureSource } from "../lib/cover-source";
import type { BookDimensions } from "../lib/dimensions";

export type BookTextures = {
  cover: Texture;
  back: Texture;
  spine: Texture;
  /** Bordas das folhas em cima e embaixo: as linhas atravessam a largura. */
  pagesTop: Texture;
  /** Borda da frente do miolo: as linhas descem pela altura. */
  pagesSide: Texture;
  coverColor: Color;
  /** As guardas: o papel tingido pela cor do livro. */
  endpaper: Color;
  paper: Color;
};

// Quanto de espessura do miolo cabe num ladrilho da textura das bordas
const EDGE_TILE = 0.18;
const MAX_ANISOTROPY = 8;
const COVER_ASPECT = 2 / 3;

type Entry = {
  promise: Promise<BookTextures>;
  users: number;
  timer?: ReturnType<typeof setTimeout>;
};

// Uma promessa por livro: o use() do React precisa da mesma a cada render
const entries = new Map<string, Entry>();

export function texturesKey(
  book: BookVisual,
  description: string | null,
  dims: BookDimensions,
) {
  return [
    book.id,
    book.coverUrl ?? "",
    // Na prévia do cadastro, cor e estilo mudam ao vivo
    book.coverColor ?? "",
    book.coverStyle,
    book.title,
    book.authors.join(","),
    description?.length ?? 0,
    dims.pagesDepth,
  ].join("|");
}

/** As texturas do livro, criadas uma vez por abertura do visualizador. */
export function loadBookTextures(
  book: BookVisual,
  description: string | null,
  dims: BookDimensions,
  maxAnisotropy: number,
): Promise<BookTextures> {
  const key = texturesKey(book, description, dims);
  const existing = entries.get(key);
  if (existing) return existing.promise;
  const promise = build(book, description, dims, maxAnisotropy);
  entries.set(key, { promise, users: 0 });
  // Falhou: a próxima tentativa começa do zero
  promise.catch(() => entries.delete(key));
  return promise;
}

/**
 * Segura as texturas enquanto o modelo está montado e libera a memória da
 * GPU depois. O descarte espera um instante: no StrictMode, o efeito
 * desmonta e monta de novo na hora.
 */
export function retainBookTextures(key: string) {
  const entry = entries.get(key);
  if (!entry) return () => {};
  clearTimeout(entry.timer);
  entry.users += 1;
  return () => {
    entry.users -= 1;
    if (entry.users > 0) return;
    entry.timer = setTimeout(() => {
      entries.delete(key);
      entry.promise
        .then((textures) => {
          for (const texture of [
            textures.cover,
            textures.back,
            textures.spine,
            textures.pagesTop,
            textures.pagesSide,
          ]) {
            texture.dispose();
          }
        })
        .catch(() => undefined);
    }, 0);
  };
}

function canvasTexture(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/**
 * A capa real, recortada no meio como o object-cover da capa 2D. Chega pela
 * rota da mesma origem (coverTextureSource). Sem imagem, com erro ou com a
 * imagem quebrada: null, e entra a capa tipográfica, sem derrubar a cena.
 */
export async function loadCoverImage(
  book: BookVisual,
  size: "M" | "L" = "L",
): Promise<Texture | null> {
  const source = coverTextureSource(book, size);
  if (!source) return null;
  try {
    const loader = new TextureLoader();
    loader.setCrossOrigin("anonymous");
    const texture = await loader.loadAsync(source);
    const { width, height } = texture.image as HTMLImageElement;
    const imageAspect = width / height;
    if (imageAspect > COVER_ASPECT) {
      const repeat = COVER_ASPECT / imageAspect;
      texture.repeat.set(repeat, 1);
      texture.offset.set((1 - repeat) / 2, 0);
    } else {
      const repeat = imageAspect / COVER_ASPECT;
      texture.repeat.set(1, repeat);
      texture.offset.set(0, (1 - repeat) / 2);
    }
    texture.colorSpace = SRGBColorSpace;
    return texture;
  } catch {
    return null;
  }
}

async function build(
  book: BookVisual,
  description: string | null,
  dims: BookDimensions,
  maxAnisotropy: number,
): Promise<BookTextures> {
  await loadCanvasFonts();
  const cover =
    (await loadCoverImage(book)) ?? canvasTexture(drawGeneratedCover(book));
  const back = canvasTexture(drawBackCover(book, description));
  const spine = canvasTexture(drawSpine(book, dims));
  const pagesTop = canvasTexture(drawPageEdges(book.id));
  const pagesSide = canvasTexture(drawPageEdges(book.id, true));

  const anisotropy = Math.min(MAX_ANISOTROPY, maxAnisotropy);
  for (const texture of [cover, back, spine, pagesTop, pagesSide]) {
    texture.anisotropy = anisotropy;
  }
  const tiles = dims.pagesDepth / EDGE_TILE;
  pagesTop.wrapT = RepeatWrapping;
  pagesTop.repeat.set(1, tiles);
  pagesSide.wrapS = RepeatWrapping;
  pagesSide.repeat.set(tiles, 1);

  const coverColor = new Color(bookColor(book));
  const paper = new Color().setRGB(
    PAPER_RGB[0] / 255,
    PAPER_RGB[1] / 255,
    PAPER_RGB[2] / 255,
    SRGBColorSpace,
  );
  return {
    cover,
    back,
    spine,
    pagesTop,
    pagesSide,
    coverColor,
    endpaper: coverColor.clone().lerp(paper, 0.65),
    paper,
  };
}
