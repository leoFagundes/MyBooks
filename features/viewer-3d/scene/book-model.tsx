"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { use, useEffect, useRef } from "react";
import type { Color, Group, Texture } from "three";
import type { SceneProps } from "../lib/types";
import {
  loadBookTextures,
  retainBookTextures,
  texturesKey,
} from "./book-textures";

// A capa aberta não deita de todo: fica um pouco erguida, como num livro real
export const OPEN_ANGLE = (170 * Math.PI) / 180;

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
  dims,
  pose,
}: Pick<SceneProps, "book" | "description" | "dims" | "pose">) {
  const maxAnisotropy = useThree((state) =>
    state.gl.capabilities.getMaxAnisotropy(),
  );
  const key = texturesKey(book, description, dims);
  const textures = use(
    loadBookTextures(book, description, dims, maxAnisotropy),
  );
  const hinge = useRef<Group>(null);

  useEffect(() => retainBookTextures(key), [key]);

  useFrame(() => {
    if (hinge.current) hinge.current.rotation.y = -pose.open.get() * OPEN_ANGLE;
  });

  const { width, height, board, overhang, pagesDepth, depth } = dims;
  const edge: Surface = { color: textures.coverColor, roughness: 0.7 };
  const endpaper: Surface = { color: textures.endpaper, roughness: 0.9 };

  return (
    <group>
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
        }}
      />
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
