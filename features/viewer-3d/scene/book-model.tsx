"use client";

import { useFrame } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useRef } from "react";
import type { Color, Group, Texture } from "three";
import type { BookDimensions } from "../lib/dimensions";
import { hingeAngle } from "../lib/hinge";

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

/** O que cobre o livro: as imagens das faces e as cores de borda e guarda. */
export type BookSurfaces = {
  cover: Texture;
  /** A contracapa desenhada; sem ela (a landing nunca mostra), a cor do livro. */
  back: Texture | null;
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

function SurfaceMaterial({
  surface,
  attach,
  gloss,
}: {
  surface: Surface;
  attach: string;
  gloss: boolean;
}) {
  if (surface.gloss && gloss) {
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
  gloss,
}: {
  size: [number, number, number];
  position: [number, number, number];
  faces: Partial<Record<Face, Surface>>;
  rest: Surface;
  gloss: boolean;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      {FACES.map((face, index) => (
        <SurfaceMaterial
          key={face}
          attach={`material-${index}`}
          surface={faces[face] ?? rest}
          gloss={gloss}
        />
      ))}
    </mesh>
  );
}

/**
 * O livro de capa dura (spec §5.7), igual no visualizador e na landing: as
 * placas sobram além do miolo e ficam a uma folga dele, a lombada leva o
 * título, o miolo mostra a borda das folhas, e a capa gira pela dobra, com o
 * pivô na face de dentro, junto à lombada. O centro do livro fica na origem, a
 * capa olha para +z e a lombada fica em −x.
 *
 * `open` (de 0 a 1) abre a capa; `pagesInset` baixa a frente do miolo para as
 * folhas que viram caberem nele (`children`, no mesmo sistema); `blockFront`
 * é o que se vê no miolo com a capa aberta (a folha de rosto).
 */
export function BookModel({
  dims,
  surfaces,
  open,
  blockFront,
  pagesInset = 0,
  gloss = true,
  children,
}: {
  dims: BookDimensions;
  surfaces: BookSurfaces;
  open?: MotionValue<number>;
  blockFront?: Texture;
  pagesInset?: number;
  /** O verniz da capa (material físico); a landing, com muitos livros, dispensa. */
  gloss?: boolean;
  children?: React.ReactNode;
}) {
  const hinge = useRef<Group>(null);

  useFrame(() => {
    if (hinge.current && open)
      hinge.current.rotation.y = -hingeAngle(open.get());
  });

  const { width, height, board, overhang, pagesDepth, gap } = dims;
  // A face de dentro de cada placa: o miolo mais a folga
  const inner = pagesDepth / 2 + gap;
  const edge: Surface = { color: surfaces.coverColor, roughness: 0.7 };
  const endpaper: Surface = { color: surfaces.endpaper, roughness: 0.9 };
  const blockDepth = pagesDepth - pagesInset;

  return (
    <group>
      <Slab
        size={[width, height, board]}
        position={[0, 0, -inner - board / 2]}
        rest={edge}
        gloss={gloss}
        faces={{
          pz: endpaper,
          nz: surfaces.back
            ? { map: surfaces.back, roughness: 0.55, gloss: true }
            : edge,
        }}
      />
      {/* A lombada cobre também as folgas: a dobra não mostra frestas */}
      <Slab
        size={[board, height, pagesDepth + 2 * gap]}
        position={[-width / 2 + board / 2, 0, 0]}
        rest={edge}
        gloss={gloss}
        faces={{ nx: { map: surfaces.spine, roughness: 0.6, gloss: true } }}
      />
      <Slab
        size={[width - board - overhang, height - 2 * overhang, blockDepth]}
        position={[(board - overhang) / 2, 0, -pagesInset / 2]}
        rest={{ color: surfaces.paper, roughness: 0.9 }}
        gloss={gloss}
        faces={{
          px: { map: surfaces.pagesSide, roughness: 0.95 },
          py: { map: surfaces.pagesTop, roughness: 0.95 },
          ny: { map: surfaces.pagesTop, roughness: 0.95 },
          pz: blockFront
            ? { map: blockFront, roughness: 0.9 }
            : { color: surfaces.paper, roughness: 0.9 },
        }}
      />
      {children}
      <group ref={hinge} position={[-width / 2, 0, inner]}>
        <Slab
          size={[width, height, board]}
          position={[width / 2, 0, board / 2]}
          rest={edge}
          gloss={gloss}
          faces={{
            pz: { map: surfaces.cover, roughness: 0.55, gloss: true },
            nz: endpaper,
          }}
        />
      </group>
    </group>
  );
}
