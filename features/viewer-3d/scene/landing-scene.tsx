"use client";

import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { cubicBezier, type MotionValue } from "motion/react";
import { Suspense, use, useEffect, useRef, useState } from "react";
import { Euler, type Group, MathUtils, Quaternion, Vector3 } from "three";
import { hashString } from "@/features/books/lib/hash";
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

export type LandingSceneProps = {
  books: BookVisual[];
  slots: LandingSlot[];
  targets: LandingTarget[];
  stage: { width: number; height: number };
  wide: boolean;
  flight: LandingFlight;
  /** A rolagem da seção, de 0 a 1 (o Lenis a move). */
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
// Quanto a rolagem amortecida demora a alcançar a de verdade (maior, mais rápido)
const SCROLL_DAMPING = 6;
// A flutuação, em px no plano e em radianos
const FLOAT_PX = 12;
const FLOAT_TURN = 0.09;
// Sem o verniz da capa (o material físico, caro com muitos livros), a lombada
// sairia uns 5% mais escura que a da página, que assume no fim
const VARNISH_LIGHT = 0.35;

const cameraDistance = (heightPx: number) =>
  heightPx / PX / 2 / Math.tan((FOV * Math.PI) / 360);

/** Aleatório repetível por livro: a mesma flutuação a cada visita. */
function seeded(seed: number) {
  let state = seed || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

type Plan = {
  start: Vector3;
  end: Vector3;
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
  target: LandingTarget,
  dims: BookDimensions,
  stage: { width: number; height: number },
  wide: boolean,
  flight: LandingFlight,
): Plan {
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
  const startScale = slot.depth * (wide ? 0.95 : 0.6);
  const start = toWorld(
    slot.x * stage.width,
    slot.y * stage.height,
    distance * (1 - 1 / startScale),
  );
  // No fim, a lombada fica no plano z = 0, em cima da lombada da página: o
  // centro do livro, girado 90°, fica meia capa para trás
  const end = toWorld(target.x, target.y, 0);
  end.z = -dims.width / 2;

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
  progress: React.RefObject<number>;
}) {
  const group = useRef<Group>(null);
  const [scratch] = useState(() => ({
    euler: new Euler(0, 0, 0, "YXZ"),
    sway: new Quaternion(),
    from: new Quaternion(),
  }));

  useFrame(({ clock }) => {
    const node = group.current;
    if (!node) return;
    const k = EASE(
      MathUtils.clamp((progress.current - plan.begin) / flightLength, 0, 1),
    );
    const loose = 1 - k;
    const time = clock.elapsedTime;
    const [wx, wy, wPitch, wYaw, wRoll] = plan.waves as [
      Plan["waves"][number],
      Plan["waves"][number],
      Plan["waves"][number],
      Plan["waves"][number],
      Plan["waves"][number],
    ];
    const floatX = (wave(time, wx) * FLOAT_PX * loose) / PX;
    const floatY = (wave(time, wy) * FLOAT_PX * loose) / PX;
    node.position.set(
      MathUtils.lerp(plan.start.x + floatX, plan.end.x, k),
      MathUtils.lerp(plan.start.y + floatY, plan.end.y, k),
      MathUtils.lerp(plan.start.z, plan.end.z, k),
    );
    // O balanço solto vai sumindo no voo, e o giro anda pelo caminho mais
    // curto (slerp): nenhum livro vira pelo lado errado
    scratch.euler.set(
      wave(time, wPitch) * FLOAT_TURN * 0.6 * loose,
      wave(time, wYaw) * FLOAT_TURN * loose,
      wave(time, wRoll) * FLOAT_TURN * 0.5 * loose,
    );
    scratch.sway.setFromEuler(scratch.euler);
    scratch.from.copy(plan.startTurn).multiply(scratch.sway);
    node.quaternion.slerpQuaternions(scratch.from, plan.endTurn, k);
  });

  return (
    <group ref={group}>
      <BookModel dims={dims} surfaces={surfaces} gloss={false} />
    </group>
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

/** A rolagem amortecida: rolar de uma vez não dá tranco nos livros. */
function useDampedProgress(progress: MotionValue<number>) {
  const damped = useRef(progress.get());
  useFrame((_, delta) => {
    damped.current = MathUtils.damp(
      damped.current,
      progress.get(),
      SCROLL_DAMPING,
      Math.min(delta, 0.1),
    );
  });
  return damped;
}

// As texturas de uma visita: uma promessa por conjunto (o use() pede a mesma)
const loads = new Map<string, Promise<LandingBookSurfaces[]>>();

function Books({
  books,
  slots,
  targets,
  stage,
  wide,
  flight,
  progress,
  onReady,
}: Omit<LandingSceneProps, "active">) {
  const entries = books.flatMap((book, index) => {
    const target = targets[index];
    const slot = slots[index];
    return target && slot ? [{ book, target, slot }] : [];
  });
  const dims = entries.map(({ target }) =>
    bookDimensionsForSpine(target.height / PX, target.width / PX),
  );
  const key = entries
    .map(({ book, target }) => `${book.id}:${target.width}x${target.height}`)
    .join("|");
  let load = loads.get(key);
  if (!load) {
    load = loadLandingSurfaces(
      entries.map(({ book }) => book),
      dims,
    );
    loads.set(key, load);
    load.catch(() => loads.delete(key));
  }
  const surfaces = use(load);
  const damped = useDampedProgress(progress);
  const [shadows, setShadows] = useState(false);
  const announced = useRef(false);

  useEffect(
    () => () => {
      loads.delete(key);
      for (const surface of surfaces) surface.dispose();
    },
    [key, surfaces],
  );

  // A sombra de contato só existe perto da prateleira: antes disso, os
  // livros estão longe da linha e ela seria um desenho a mais por quadro
  useFrame(() => {
    const near = damped.current > flight.start + flight.spread * 0.6;
    if (near !== shadows) setShadows(near);
    if (!announced.current) {
      announced.current = true;
      requestAnimationFrame(() => onReady());
    }
  });

  const plans = entries.map(({ book, slot, target }, index) =>
    planBook(
      book,
      index,
      entries.length,
      slot,
      target,
      dims[index] as BookDimensions,
      stage,
      wide,
      flight,
    ),
  );

  // A linha da prateleira: a base das lombadas, onde a sombra se apoia
  const shelf = entries.reduce(
    (box, { target }) => ({
      left: Math.min(box.left, target.x - target.width / 2),
      right: Math.max(box.right, target.x + target.width / 2),
      bottom: Math.max(box.bottom, target.y + target.height / 2),
      height: Math.max(box.height, target.height),
    }),
    { left: Infinity, right: -Infinity, bottom: 0, height: 0 },
  );
  const deepest = Math.max(...dims.map((size) => size.width));

  return (
    <>
      {entries.map(({ book }, index) => (
        <FlyingBook
          key={book.id}
          plan={plans[index] as Plan}
          dims={dims[index] as BookDimensions}
          surfaces={(surfaces[index] as LandingBookSurfaces).surfaces}
          flightLength={flight.length}
          progress={damped}
        />
      ))}
      {shadows && entries.length > 0 ? (
        <ContactShadows
          position={[
            ((shelf.left + shelf.right) / 2 - stage.width / 2) / PX,
            -(shelf.bottom - stage.height / 2) / PX,
            -deepest / 2,
          ]}
          scale={[(shelf.right - shelf.left) / PX + deepest, deepest * 1.5]}
          far={shelf.height / PX}
          blur={2.4}
          opacity={0.3}
          resolution={256}
          frames={Infinity}
        />
      ) : null}
    </>
  );
}

/**
 * Os livros da landing (MELHORIAS 3.3), numa cena R3F só: cada um é o
 * BookModel do visualizador, com as medidas da lombada de verdade da
 * prateleira. Flutuam cada um no seu ritmo e, com a rolagem (amortecida),
 * voam girando pelo caminho mais curto até cair em cima das lombadas da
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
