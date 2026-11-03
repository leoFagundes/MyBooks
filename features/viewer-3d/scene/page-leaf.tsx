"use client";

import { useFrame } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import {
  Bone,
  BoxGeometry,
  type Color,
  Float32BufferAttribute,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  type Texture,
  Uint16BufferAttribute,
  Vector3,
} from "three";
import { leafTurn } from "../lib/hinge";

const SEGMENTS = 24;
export const LEAF_THICKNESS = 0.004;
// Quanto a folha se curva no meio do giro, somando todos os ossos
const BEND = 0.5;

type Leaf = { mesh: SkinnedMesh; bones: Bone[]; dispose: () => void };

/**
 * Uma folha fina com um osso por segmento ao longo da largura: cada vértice
 * segue os dois ossos mais perto, e a folha pode se curvar. O pivô fica na
 * borda da lombada (x = 0); a frente olha para +z.
 */
function buildLeaf(
  width: number,
  height: number,
  front: Texture,
  back: Texture,
  paper: Color,
): Leaf {
  const segment = width / SEGMENTS;
  const geometry = new BoxGeometry(width, height, LEAF_THICKNESS, SEGMENTS, 2);
  geometry.translate(width / 2, 0, 0);

  const positions = geometry.attributes.position;
  const vertex = new Vector3();
  const indices: number[] = [];
  const weights: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i);
    const bone = Math.min(SEGMENTS - 1, Math.floor(vertex.x / segment));
    const weight = (vertex.x - bone * segment) / segment;
    indices.push(bone, bone + 1, 0, 0);
    weights.push(1 - weight, weight, 0, 0);
  }
  geometry.setAttribute("skinIndex", new Uint16BufferAttribute(indices, 4));
  geometry.setAttribute("skinWeight", new Float32BufferAttribute(weights, 4));

  const bones = Array.from({ length: SEGMENTS + 1 }, (_, index) => {
    const bone = new Bone();
    bone.position.x = index === 0 ? 0 : segment;
    return bone;
  });
  for (let i = 1; i < bones.length; i++) bones[i - 1]?.add(bones[i] as Bone);

  const edge = new MeshStandardMaterial({ color: paper, roughness: 0.9 });
  const frontFace = new MeshStandardMaterial({ map: front, roughness: 0.9 });
  const backFace = new MeshStandardMaterial({ map: back, roughness: 0.9 });
  const mesh = new SkinnedMesh(geometry, [
    edge,
    edge,
    edge,
    edge,
    frontFace,
    backFace,
  ]);
  mesh.add(bones[0] as Bone);
  mesh.bind(new Skeleton(bones));
  // A caixa de colisão não acompanha os ossos: sem isto, a folha virada some
  mesh.frustumCulled = false;

  return {
    mesh,
    bones,
    dispose: () => {
      geometry.dispose();
      edge.dispose();
      frontFace.dispose();
      backFace.dispose();
    },
  };
}

/**
 * Uma folha que se vira (spec §5.7, "folhear algumas páginas com
 * curvatura"): a raiz gira até `rest` pela borda da lombada, e no meio do
 * caminho os ossos curvam a folha, que assenta reta do outro lado.
 */
export function PageLeaf({
  width,
  height,
  front,
  back,
  paper,
  turned,
  rest,
  lift,
  position,
}: {
  width: number;
  height: number;
  front: Texture;
  back: Texture;
  paper: Color;
  turned: MotionValue<number>;
  /** O ângulo da folha virada, um pouco menos que a capa: ela deita por cima. */
  rest: number;
  /**
   * Quanto a folha sobe ao virar. Aberta, a guarda da capa fica uma placa
   * acima do miolo, e a folha virada precisa deitar por cima dela.
   */
  lift: number;
  position: [number, number, number];
}) {
  const leaf = useMemo(
    () => buildLeaf(width, height, front, back, paper),
    [width, height, front, back, paper],
  );
  const rig = useRef(leaf);

  useEffect(() => {
    rig.current = leaf;
    return () => leaf.dispose();
  }, [leaf]);

  useFrame(() => {
    const { mesh, bones } = rig.current;
    // A mola que passa do fim deitaria a folha dentro da capa; a que passa do
    // começo, dentro do miolo
    const t = leafTurn(turned.get());
    mesh.position.z = position[2] + t * lift;
    const root = bones[0];
    if (root) root.rotation.y = -t * rest;
    // A ponta solta fica para trás no meio do giro e assenta reta no fim
    const bend = (Math.sin(t * Math.PI) * BEND) / SEGMENTS;
    for (let i = 1; i < bones.length; i++) {
      const bone = bones[i];
      if (bone) bone.rotation.y = bend;
    }
  });

  return <primitive object={leaf.mesh} position={position} />;
}
