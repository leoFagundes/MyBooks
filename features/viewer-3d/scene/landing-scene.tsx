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
import { hashString } from "@/features/books/lib/hash";
import { spineHeight, spineWidth } from "@/features/books/lib/spine";
import type { BookVisual } from "@/features/books/types";
import { easing } from "@/lib/motion";
import { type BookDimensions, bookDimensionsForSpine } from "../lib/dimensions";
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

/** Onde o livro flutua no começo (frações do palco) e o quanto está perto. */
export type LandingSlot = { x: number; y: number; depth: number };

/** O trecho da rolagem em que cada livro voa até a prateleira. */
export type LandingFlight = { start: number; spread: number; length: number };

/** Um bloco de texto do título, em px no palco, que os livros não cobrem. */
export type LandingBlock = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

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

// Um px do palco vale 1/100 de unidade no plano z = 0, onde ficam as lombadas
const PX = 100;
// Campo estreito: as lombadas no fim quase não mostram os lados
const FOV = 22;
const EASE = cubicBezier(...easing);
// O tamanho de partida, sobre o da lombada: no celular, menor; na tela larga,
// cheio a partir de FULL_WIDTH (px) e menor abaixo dela (no tablet em pé, os
// livros do tamanho do computador se amontoavam)
const NARROW_SCALE = 0.6;
const WIDE_SCALE = 0.95;
const FULL_WIDTH = 1280;
// A flutuação, em px no plano e em radianos
const FLOAT_PX = 12;
const FLOAT_TURN = 0.09;
// Sem a história, a cena acaba no meio da página e tem o texto no meio:
// cada livro, com a flutuação e mais esta folga (px), fica inteiro dentro
// dela e fora do texto, menor se o espaço for curto; se nem com esta fração
// do tamanho ele couber, fica de fora
const FLOAT_MARGIN = 8;
const MIN_FIT = 0.6;
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

const cameraDistance = (heightPx: number) =>
  heightPx / PX / 2 / Math.tan((FOV * Math.PI) / 360);

/** As medidas da lombada de verdade (as mesmas da BookSpine), em unidades. */
const dimensionsOf = (book: BookVisual) =>
  bookDimensionsForSpine(
    spineHeight(book.id) / PX,
    spineWidth(book.pageCount) / PX,
  );

/** Aleatório repetível por livro: a mesma flutuação a cada visita. */
function seeded(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

const overlaps = (a: LandingBlock, b: LandingBlock) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * Onde o livro flutua sem a história: na altura da vaga, se não cobrir o
 * texto; senão, acima ou abaixo dele (o lado da vaga), encolhido até caber.
 */
function floatPlacement(
  slot: LandingSlot,
  dims: BookDimensions,
  stage: { width: number; height: number },
  startScale: number,
  avoid: LandingBlock[],
) {
  const pad = FLOAT_PX + FLOAT_MARGIN;
  const height = dims.height * PX * startScale;
  const x = slot.x * stage.width;
  const halfWidth = (dims.width * PX * startScale) / 2 + pad;
  const inside = (y: number, top: number, bottom: number, fit: number) => {
    const half = (height * fit) / 2 + pad;
    return MathUtils.clamp(y, top + half, Math.max(top + half, bottom - half));
  };
  let top = 0;
  let bottom = stage.height;
  const y = inside(slot.y * stage.height, top, bottom, 1);
  const half = height / 2 + pad;
  const box = {
    left: x - halfWidth,
    right: x + halfWidth,
    top: y - half,
    bottom: y + half,
  };
  if (avoid.some((block) => overlaps(box, block))) {
    const textTop = Math.min(...avoid.map((block) => block.top));
    const textBottom = Math.max(...avoid.map((block) => block.bottom));
    if (slot.y * stage.height < (textTop + textBottom) / 2) bottom = textTop;
    else top = textBottom;
  }
  const fit = Math.min(1, (bottom - top - 2 * pad) / height);
  if (fit < MIN_FIT) return null;
  return {
    y: inside(slot.y * stage.height, top, bottom, fit),
    scale: startScale * fit,
  };
}

type Plan = {
  start: Vector3;
  /** Onde pousa, em cima da lombada da página; sem a história, não pousa. */
  end: Vector3 | null;
  startTurn: Quaternion;
  endTurn: Quaternion;
  begin: number;
  /** Frequências (rad/s) e fases da flutuação, uma por eixo e por giro. */
  waves: { speed: number; phase: number }[];
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
  // Perto é maior: a escala de partida vira a profundidade, pela perspectiva
  let startScale =
    slot.depth *
    (wide
      ? WIDE_SCALE * MathUtils.clamp(stage.width / FULL_WIDTH, 0.6, 1)
      : NARROW_SCALE);
  let y = slot.y * stage.height;
  if (!target) {
    const placement = floatPlacement(
      slot,
      dims,
      stage,
      startScale,
      avoid ?? [],
    );
    if (!placement) return null;
    y = placement.y;
    startScale = placement.scale;
  }
  const start = toWorld(
    slot.x * stage.width,
    y,
    distance * (1 - 1 / startScale),
  );
  // No fim, a lombada fica no plano z = 0, em cima da lombada da página: o
  // centro do livro, girado 90°, fica meia capa para trás
  let end: Vector3 | null = null;
  if (target) {
    end = toWorld(target.x, target.y, 0);
    end.z = -dims.width / 2;
  }

  const random = seeded(hashString(book.id));
  // Partida de 3/4, nunca de perfil: um pouco da lombada ou da borda das
  // folhas, e às vezes do alto
  const side = random() < 0.5 ? -1 : 1;
  const startTurn = new Quaternion().setFromEuler(
    new Euler(
      -0.08 + random() * 0.22,
      side * (0.34 + random() * 0.3),
      (random() - 0.5) * 0.2,
      "YXZ",
    ),
  );
  const endTurn = new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0));
  // Cinco ondas sem relação entre si: x, y, e os três giros
  const waves = Array.from({ length: 5 }, () => ({
    speed: 0.35 + random() * 0.45,
    phase: random() * Math.PI * 2,
  }));
  const begin =
    flight.start + (total > 1 ? (index / (total - 1)) * flight.spread : 0);
  return { start, end, startTurn, endTurn, begin, waves };
}

/** Uma onda suave: dois senos com razão irracional, que nunca se repetem juntos. */
const wave = (time: number, { speed, phase }: Plan["waves"][number]) =>
  Math.sin(time * speed + phase) * 0.7 +
  Math.sin(time * speed * 2.17 + phase * 1.3) * 0.3;

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
  // volta a zero quando o frameloop muda, e os livros saltariam)
  const time = useRef(0);
  const [scratch] = useState(() => ({
    euler: new Euler(0, 0, 0, "YXZ"),
    sway: new Quaternion(),
    from: new Quaternion(),
  }));

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    time.current += Math.min(delta, 0.1);
    const end = plan.end ?? plan.start;
    const t = plan.end
      ? MathUtils.clamp((progress.get() - plan.begin) / flightLength, 0, 1)
      : 0;
    const k = EASE(t);
    const loose = 1 - k;
    const [wx, wy, wPitch, wYaw, wRoll] = plan.waves as [
      Plan["waves"][number],
      Plan["waves"][number],
      Plan["waves"][number],
      Plan["waves"][number],
      Plan["waves"][number],
    ];
    const floatX = (wave(time.current, wx) * FLOAT_PX * loose) / PX;
    const floatY = (wave(time.current, wy) * FLOAT_PX * loose) / PX;
    node.position.set(
      MathUtils.lerp(plan.start.x + floatX, end.x, k),
      MathUtils.lerp(plan.start.y + floatY, end.y, k),
      MathUtils.lerp(plan.start.z, end.z, k),
    );
    // O balanço solto vai sumindo no voo, e o giro anda pelo caminho mais
    // curto (slerp): nenhum livro vira pelo lado errado
    scratch.euler.set(
      wave(time.current, wPitch) * FLOAT_TURN * 0.6 * loose,
      wave(time.current, wYaw) * FLOAT_TURN * loose,
      wave(time.current, wRoll) * FLOAT_TURN * 0.5 * loose,
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
  const dims = entries.map(({ book }) => dimensionsOf(book));
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
