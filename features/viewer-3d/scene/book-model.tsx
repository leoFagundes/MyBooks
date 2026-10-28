"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { use, useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  type Color,
  type Group,
  SRGBColorSpace,
  type Texture,
} from "three";
import { drawQuotePage, drawTitlePage } from "../lib/book-art";
import { type PageLayout, pageLayout } from "../lib/pages";
import type { SceneProps } from "../lib/types";
import {
  loadBookTextures,
  retainBookTextures,
  texturesKey,
} from "./book-textures";
import { LEAF_THICKNESS, PageLeaf } from "./page-leaf";

// A capa aberta não deita de todo: fica um pouco erguida, como num livro real
export const OPEN_ANGLE = (170 * Math.PI) / 180;
// As folhas viradas deitam um pouco antes da capa, uma sobre a outra
const LEAF_REST_GAP = 0.03;
const LEAF_GAP = LEAF_THICKNESS * 1.25;

type Face = "px" | "nx" | "py" | "ny" | "pz" | "nz";
// A ordem dos grupos de material do BoxGeometry
const FACES: Face[] = ["px", "nx", "py", "ny", "pz", "nz"];

type Surface = {
  map?: Texture;
  color?: Color;
  roughness: number;
  /** O leve brilho da capa (spec §5.7): verniz por cima da impressão. */
  gloss?: boolean;
};

function SurfaceMaterial({
  surface,
  attach,
}: {
  surface: Surface;
  attach: string;
}) {
  if (surface.gloss) {
    return (
      <meshPhysicalMaterial
        attach={attach}
        map={surface.map ?? null}
        color={surface.color}
        roughness={surface.roughness}
        clearcoat={0.35}
        clearcoatRoughness={0.35}
      />
    );
  }
  return (
    <meshStandardMaterial
      attach={attach}
      map={surface.map ?? null}
      color={surface.color}
      roughness={surface.roughness}
    />
  );
}

/**
 * A folha de rosto, na frente do miolo. Redesenha quando a citação chega
 * (as fontes já carregaram com as outras texturas).
 */
function useTitlePage(
  book: SceneProps["book"],
  description: string | null,
  quote: SceneProps["quotes"][number] | null,
  dims: SceneProps["dims"],
  maxAnisotropy: number,
) {
  const aspect =
    (dims.width - dims.board - dims.overhang) /
    (dims.height - 2 * dims.overhang);
  const texture = useMemo(() => {
    const page = new CanvasTexture(
      drawTitlePage(book, description, quote, aspect),
    );
    page.colorSpace = SRGBColorSpace;
    page.anisotropy = Math.min(8, maxAnisotropy);
    return page;
  }, [book, description, quote, aspect, maxAnisotropy]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** As páginas de citação das folhas que se viram (a primeira face é a folha de rosto). */
function useQuotePages(
  faces: PageLayout["faces"],
  aspect: number,
  maxAnisotropy: number,
) {
  const textures = useMemo(
    () =>
      faces.slice(1).map((quote) => {
        const page = new CanvasTexture(drawQuotePage(quote, aspect));
        page.colorSpace = SRGBColorSpace;
        page.anisotropy = Math.min(8, maxAnisotropy);
        return page;
      }),
    [faces, aspect, maxAnisotropy],
  );
  useEffect(
    () => () => {
      for (const texture of textures) texture.dispose();
    },
    [textures],
  );
  return textures;
}

/** Uma peça do livro: uma caixa com uma superfície por face. */
function Slab({
  size,
  position,
  faces,
  rest,
}: {
  size: [number, number, number];
  position: [number, number, number];
  faces: Partial<Record<Face, Surface>>;
  rest: Surface;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      {FACES.map((face, index) => (
        <SurfaceMaterial
          key={face}
          attach={`material-${index}`}
          surface={faces[face] ?? rest}
        />
      ))}
    </mesh>
  );
}

/**
 * O livro (spec §5.7): capa dura com placas que sobram além do miolo, lombada
 * com o título, miolo com a borda das folhas e a capa num grupo com o pivô na
 * lombada, que gira pela dobra ao abrir. O centro do livro fica na origem, a
 * capa olha para +z e a lombada fica em −x.
 */
export function BookModel({
  book,
  description,
  quotes,
  dims,
  pose,
}: Pick<SceneProps, "book" | "description" | "quotes" | "dims" | "pose">) {
  const maxAnisotropy = useThree((state) =>
    state.gl.capabilities.getMaxAnisotropy(),
  );
  const key = texturesKey(book, description, dims);
  const textures = use(
    loadBookTextures(book, description, dims, maxAnisotropy),
  );
  const titlePage = useTitlePage(
    book,
    description,
    quotes[0] ?? null,
    dims,
    maxAnisotropy,
  );
  const layout = useMemo(() => pageLayout(quotes), [quotes]);
  const pageWidth = dims.width - dims.board - dims.overhang;
  const pageHeight = dims.height - 2 * dims.overhang;
  const quotePages = useQuotePages(
    layout.faces,
    pageWidth / pageHeight,
    maxAnisotropy,
  );
  const shift = useRef<Group>(null);
  const hinge = useRef<Group>(null);

  useEffect(() => retainBookTextures(key), [key]);

  useFrame(() => {
    if (shift.current) shift.current.position.x = pose.shift.get();
    if (hinge.current) hinge.current.rotation.y = -pose.open.get() * OPEN_ANGLE;
  });

  const { width, height, board, overhang, pagesDepth, depth } = dims;
  const edge: Surface = { color: textures.coverColor, roughness: 0.7 };
  const endpaper: Surface = { color: textures.endpaper, roughness: 0.9 };
  // Com folhas para virar, a folha de rosto vai na primeira delas, e o miolo
  // embaixo fica em branco
  const pageFaces = [titlePage, ...quotePages];
  const blockFront: Surface =
    layout.leafCount > 0
      ? { color: textures.paper, roughness: 0.9 }
      : { map: titlePage, roughness: 0.9 };

  return (
    <group ref={shift}>
      <Slab
        size={[width, height, board]}
        position={[0, 0, -depth / 2 + board / 2]}
        rest={edge}
        faces={{
          pz: endpaper,
          nz: { map: textures.back, roughness: 0.55, gloss: true },
        }}
      />
      <Slab
        size={[board, height, pagesDepth]}
        position={[-width / 2 + board / 2, 0, 0]}
        rest={edge}
        faces={{ nx: { map: textures.spine, roughness: 0.6, gloss: true } }}
      />
      <Slab
        size={[width - board - overhang, height - 2 * overhang, pagesDepth]}
        position={[(board - overhang) / 2, 0, 0]}
        rest={{ color: textures.paper, roughness: 0.9 }}
        faces={{
          px: { map: textures.pagesSide, roughness: 0.95 },
          py: { map: textures.pagesTop, roughness: 0.95 },
          ny: { map: textures.pagesTop, roughness: 0.95 },
          pz: blockFront,
        }}
      />
      {Array.from({ length: layout.leafCount }, (_, index) => {
        const front = pageFaces[index * 2];
        const back = pageFaces[index * 2 + 1];
        const turned = pose.leaves[index];
        if (!front || !back || !turned) return null;
        return (
          <PageLeaf
            key={index}
            width={pageWidth}
            height={pageHeight}
            front={front}
            back={back}
            paper={textures.paper}
            turned={turned}
            // Quem vira depois deita um pouco mais alto e fica por cima
            rest={OPEN_ANGLE - LEAF_REST_GAP * (index + 1)}
            lift={board + LEAF_THICKNESS}
            position={[
              -width / 2 + board,
              0,
              pagesDepth / 2 +
                LEAF_THICKNESS / 2 +
                (layout.leafCount - 1 - index) * LEAF_GAP,
            ]}
          />
        );
      })}
      <group ref={hinge} position={[-width / 2, 0, depth / 2 - board / 2]}>
        <Slab
          size={[width, height, board]}
          position={[width / 2, 0, 0]}
          rest={edge}
          faces={{
            pz: { map: textures.cover, roughness: 0.55, gloss: true },
            nz: endpaper,
          }}
        />
      </group>
    </group>
  );
}
