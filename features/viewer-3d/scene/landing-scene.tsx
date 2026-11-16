"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { cubicBezier, type MotionValue } from "motion/react";
import { Suspense, use, useEffect, useRef, useState } from "react";
import {
  CanvasTexture,
  Euler,
  type Group,
  MathUtils,
  type MeshBasicMaterial,
  Quaternion,
  Vector3,
} from "three";
import { INK_RGB, toHex } from "@/features/books/lib/color";
import type { BookVisual } from "@/features/books/types";
import { easing } from "@/lib/motion";
import type { BookDimensions } from "../lib/dimensions";
import {
  cameraDistance,
  FLOAT_PX,
  FLOAT_TURN,
  FOV,
  type LandingBlock,
  type LandingSlot,
  landingDimensions,
  landingStart,
  landingTime,
  PX,
  type Wave,
  wave,
} from "../lib/landing-layout";
import { BookModel } from "./book-model";
import {
  type LandingBookSurfaces,
  loadLandingSurfaces,
} from "./landing-textures";
import { StudioLights } from "./studio";

/** A lombada de verdade da prateleira, em px, no palco da história. */
export type LandingTarget = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type { LandingBlock, LandingSlot } from "../lib/landing-layout";

/** O trecho da rolagem em que cada livro voa até a prateleira. */
export type LandingFlight = { start: number; spread: number; length: number };

export type LandingSceneProps = {
  books: BookVisual[];
  slots: LandingSlot[];
  /**
   * As lombadas da prateleira, o destino de cada livro. Sem elas (fora do
   * computador, onde não há a história da rolagem), os livros só flutuam.
   */
  targets: LandingTarget[] | null;
  /** Sem a história, o texto do título: os livros flutuam fora dele. */
  avoid: LandingBlock[] | null;
  stage: { width: number; height: number };
  wide: boolean;
  flight: LandingFlight;
  /** A história, de 0 a 1, já amortecida: a mesma que move a página. */
  progress: MotionValue<number>;
  /** Fora da tela, ou depois da troca pela prateleira de verdade: não desenha. */
  active: boolean;
  onReady: () => void;
};

const EASE = cubicBezier(...easing);
// Sem o verniz da capa (o material físico, caro com muitos livros), a lombada
// sairia uns 5% mais escura que a da página, que assume no fim
const VARNISH_LIGHT = 0.35;
// A sombra de contato de cada livro, no chão da prateleira: escurece no fim do
// voo (deste trecho do tempo dele em diante, quando o livro já está perto) e
// passa da base dele (em unidades)
const SHADOW_OPACITY = 0.35;
const SHADOW_FROM = 0.7;
const SHADOW_SPREAD = 0.12;
// Desmontada, a cena ainda segura as texturas por um tempo: o StrictMode (no
// dev) desmonta e monta de novo na hora, e a volta pelo histórico também
const RELEASE_MS = 2000;

type Plan = {
  start: Vector3;
  /** Onde pousa, em cima da lombada da página; sem a história, não pousa. */
  end: Vector3 | null;
  startTurn: Quaternion;
  endTurn: Quaternion;
  begin: number;
  /** Frequências (rad/s) e fases da flutuação, uma por eixo e por giro. */
  waves: [Wave, Wave, Wave, Wave, Wave];
};

function planBook(
  book: BookVisual,
  index: number,
  total: number,
  slot: LandingSlot,
  target: LandingTarget | null,
  avoid: LandingBlock[] | null,
  dims: BookDimensions,
  stage: { width: number; height: number },
  wide: boolean,
  flight: LandingFlight,
): Plan | null {
  const distance = cameraDistance(stage.height);
  // Um ponto do palco (px) no mundo, à profundidade z
  const toWorld = (x: number, y: number, z: number) => {
    const scale = (distance - z) / distance;
    return new Vector3(
      ((x - stage.width / 2) / PX) * scale,
      (-(y - stage.height / 2) / PX) * scale,
      z,
    );
  };
  const from = landingStart(book, slot, !target, avoid, dims, stage, wide);
  if (!from) return null;
  // Perto é maior: a escala de partida vira a profundidade, pela perspectiva
  const start = toWorld(from.x, from.y, distance * (1 - 1 / from.scale));
  // No fim, a lombada fica no plano z = 0, em cima da lombada da página: o
  // centro do livro, girado 90°, fica meia capa para trás
  let end: Vector3 | null = null;
  if (target) {
    end = toWorld(target.x, target.y, 0);
    end.z = -dims.width / 2;
  }

  const startTurn = new Quaternion().setFromEuler(
    new Euler(from.pitch, from.yaw, from.roll, "YXZ"),
  );
  const endTurn = new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0));
  const begin =
    flight.start + (total > 1 ? (index / (total - 1)) * flight.spread : 0);
  return { start, end, startTurn, endTurn, begin, waves: from.waves };
}

let shadowMap: CanvasTexture | null = null;

/** A sombra de um livro vista do alto: um retângulo desfocado, um para todos. */
function contactShadowMap() {
  if (shadowMap) return shadowMap;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    // O retângulo fica fora do quadro: só a sombra dele, desfocada, cai no meio
    context.fillStyle = toHex(INK_RGB);
    context.shadowColor = toHex(INK_RGB);
    context.shadowBlur = size / 5;
    context.shadowOffsetX = size;
    context.fillRect(size / 4 - size, size / 4, size / 2, size / 2);
  }
  shadowMap = new CanvasTexture(canvas);
  return shadowMap;
}

function FlyingBook({
  plan,
  dims,
  surfaces,
  flightLength,
  progress,
}: {
  plan: Plan;
  dims: BookDimensions;
  surfaces: LandingBookSurfaces["surfaces"];
  flightLength: number;
  progress: MotionValue<number>;
}) {
  const group = useRef<Group>(null);
  const shade = useRef<MeshBasicMaterial>(null);
  // O relógio da flutuação para com a cena e segue de onde parou (o do R3F
  // volta a zero quando o frameloop muda, e os livros saltariam). Começa onde
  // estão as capas que seguravam o lugar: a troca não sai do lugar
  const time = useRef<number | null>(null);
  const [scratch] = useState(() => ({
    euler: new Euler(0, 0, 0, "YXZ"),
    sway: new Quaternion(),
    from: new Quaternion(),
  }));

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    const elapsed =
      time.current === null
        ? landingTime()
        : time.current + Math.min(delta, 0.1);
    time.current = elapsed;
    const end = plan.end ?? plan.start;
    const t = plan.end
      ? MathUtils.clamp((progress.get() - plan.begin) / flightLength, 0, 1)
      : 0;
    const k = EASE(t);
    const loose = 1 - k;
    const [wx, wy, wPitch, wYaw, wRoll] = plan.waves;
    const floatX = (wave(elapsed, wx) * FLOAT_PX * loose) / PX;
    const floatY = (wave(elapsed, wy) * FLOAT_PX * loose) / PX;
    node.position.set(
      MathUtils.lerp(plan.start.x + floatX, end.x, k),
      MathUtils.lerp(plan.start.y + floatY, end.y, k),
      MathUtils.lerp(plan.start.z, end.z, k),
    );
    // O balanço solto vai sumindo no voo, e o giro anda pelo caminho mais
    // curto (slerp): nenhum livro vira pelo lado errado
    scratch.euler.set(
      wave(elapsed, wPitch) * FLOAT_TURN * 0.6 * loose,
      wave(elapsed, wYaw) * FLOAT_TURN * loose,
      wave(elapsed, wRoll) * FLOAT_TURN * 0.5 * loose,
    );
    scratch.sway.setFromEuler(scratch.euler);
    scratch.from.copy(plan.startTurn).multiply(scratch.sway);
    node.quaternion.slerpQuaternions(scratch.from, plan.endTurn, k);

    const material = shade.current;
    if (material) {
      material.opacity =
        SHADOW_OPACITY * MathUtils.smoothstep(t, SHADOW_FROM, 1);
      material.visible = material.opacity > 0.001;
    }
  });

  return (
    <>
      <group ref={group}>
        <BookModel dims={dims} surfaces={surfaces} gloss={false} />
      </group>
      {plan.end ? (
        // No chão, sob a base do livro pousado: o próprio livro esconde o
        // meio, e o que sobra escurece os vãos e as pontas da prateleira
        <mesh
          position={[
            plan.end.x,
            plan.end.y - dims.height / 2 + 0.002,
            plan.end.z,
          ]}
          rotation-x={-Math.PI / 2}
          scale={[
            dims.depth + 2 * SHADOW_SPREAD,
            dims.width + 2 * SHADOW_SPREAD,
            1,
          ]}
        >
          <planeGeometry />
          <meshBasicMaterial
            ref={shade}
            map={contactShadowMap()}
            transparent
            depthWrite={false}
            opacity={0}
            visible={false}
          />
        </mesh>
      ) : null}
    </>
  );
}

/** A câmera no eixo do palco, à distância em que 100px viram uma unidade em z = 0. */
function CameraRig() {
  const applied = useRef(0);
  useFrame(({ camera, size }) => {
    if (applied.current === size.height) return;
    applied.current = size.height;
    const distance = cameraDistance(size.height);
    camera.position.set(0, 0, distance);
    camera.far = distance * 4;
    camera.updateProjectionMatrix();
  });
  return null;
}

type CachedSurfaces = {
  load: Promise<LandingBookSurfaces[]>;
  users: number;
  release: number | undefined;
};

// As texturas por conjunto de livros. O use() recebe sempre a mesma promessa,
// e a cena montada segura as dela: se uma cena que volta carregasse tudo de
// novo, o Suspense apagaria os livros até o fim da carga (era o pisca)
const cache = new Map<string, CachedSurfaces>();

function surfacesFor(key: string, books: BookVisual[], dims: BookDimensions[]) {
  let cached = cache.get(key);
  if (!cached) {
    const load = loadLandingSurfaces(books, dims);
    cached = { load, users: 0, release: undefined };
    cache.set(key, cached);
    load.catch(() => cache.delete(key));
  }
  return cached.load;
}

/** Segura as texturas enquanto a cena existe; sem ninguém, saem depois de um tempo. */
function useHeldSurfaces(key: string) {
  useEffect(() => {
    const cached = cache.get(key);
    if (!cached) return;
    cached.users += 1;
    window.clearTimeout(cached.release);
    return () => {
      cached.users -= 1;
      if (cached.users > 0) return;
      cached.release = window.setTimeout(() => {
        cache.delete(key);
        void cached.load.then((list) => {
          for (const item of list) item.dispose();
        });
      }, RELEASE_MS);
    };
  }, [key]);
}

function Books({
  books,
  slots,
  targets,
  avoid,
  stage,
  wide,
  flight,
  progress,
  onReady,
}: Omit<LandingSceneProps, "active">) {
  // Na história, só voa quem tem lombada; sem ela, todos flutuam
  const entries = books.flatMap((book, index) => {
    const slot = slots[index];
    const target = targets ? targets[index] : null;
    return slot && target !== undefined ? [{ book, slot, target }] : [];
  });
  const dims = entries.map(({ book }) => landingDimensions(book));
  // As medidas vêm só dos livros: medir a página de novo não recarrega nada
  const key = entries.map(({ book }) => book.id).join("|");
  const surfaces = use(
    surfacesFor(
      key,
      entries.map(({ book }) => book),
      dims,
    ),
  );
  useHeldSurfaces(key);
  const announced = useRef(false);

  useFrame(() => {
    if (announced.current) return;
    announced.current = true;
    requestAnimationFrame(() => onReady());
  });

  return entries.map(({ book, slot, target }, index) => {
    const size = dims[index] as BookDimensions;
    const plan = planBook(
      book,
      index,
      entries.length,
      slot,
      target,
      avoid,
      size,
      stage,
      wide,
      flight,
    );
    // Sem lugar fora do texto, o livro fica de fora (as texturas continuam)
    return plan ? (
      <FlyingBook
        key={book.id}
        plan={plan}
        dims={size}
        surfaces={(surfaces[index] as LandingBookSurfaces).surfaces}
        flightLength={flight.length}
        progress={progress}
      />
    ) : null;
  });
}

/**
 * Os livros da landing (MELHORIAS 3.3), numa cena R3F só: cada um é o
 * BookModel do visualizador, com as medidas da lombada de verdade da
 * prateleira. Flutuam cada um no seu ritmo e, no computador, voam com a
 * história girando pelo caminho mais curto até cair em cima das lombadas da
 * página, que assumem no fim. É ponto de entrada de three, como a book-scene:
 * chega por next/dynamic, depois do título.
 */
export default function LandingScene({ active, ...props }: LandingSceneProps) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.5]}
      flat
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: FOV, near: 0.1, far: 100 }}
    >
      <CameraRig />
      <StudioLights />
      <ambientLight intensity={VARNISH_LIGHT} />
      <Suspense fallback={null}>
        <Books {...props} />
      </Suspense>
    </Canvas>
  );
}
