"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { type Group, PerspectiveCamera } from "three";
import { CAMERA_FOV } from "../lib/framing";
import type { PoseValues, SceneProps } from "../lib/types";
import { ViewerBook } from "./viewer-book";
import { Studio } from "./studio";

// O livro flutua um pouco acima do chão, onde fica a sombra
const FLOAT = 0.3;

/**
 * A cena do visualizador (spec §5.7). É o único ponto de entrada de three,
 * R3F e drei: chega por next/dynamic só quando o visualizador abre. Desenha
 * sob demanda, quando a pose muda, e não a cada quadro.
 */
export default function BookScene({
  book,
  description,
  quotes,
  dims,
  framing,
  pose,
  onReady,
}: SceneProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      // Sem tone mapping: as cores da capa saem como na imagem, e o crossfade
      // do clone 2D para o 3D não muda de cor
      flat
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 100 }}
    >
      <CameraRig dims={dims} framing={framing} pose={pose} />
      <ContextLossGuard />
      <Studio floorY={-dims.height / 2 - FLOAT} />
      <PoseGroup pose={pose}>
        {/* As texturas carregam aqui dentro: o sinal de pronto só sai com o livro inteiro */}
        <Suspense fallback={null}>
          <ViewerBook
            book={book}
            description={description}
            quotes={quotes}
            dims={dims}
            pose={pose}
          />
          <ReadySignal onReady={onReady} />
        </Suspense>
      </PoseGroup>
    </Canvas>
  );
}

/**
 * A câmera fica no eixo do livro, à distância do enquadramento dividida pelo
 * zoom. O deslocamento da projeção põe o centro do palco no centro da imagem
 * sem girar a câmera, e a capa de frente continua um retângulo exato.
 */
function CameraRig({
  dims,
  framing,
  pose,
}: Pick<SceneProps, "dims" | "framing" | "pose">) {
  const invalidate = useThree((state) => state.invalidate);
  const applied = useRef("");

  useEffect(() => invalidate(), [dims, framing, invalidate]);

  useFrame(({ camera, size }) => {
    const key = `${size.width}x${size.height}:${framing.viewOffsetY}`;
    if (camera instanceof PerspectiveCamera && applied.current !== key) {
      applied.current = key;
      camera.setViewOffset(
        size.width,
        size.height,
        0,
        framing.viewOffsetY,
        size.width,
        size.height,
      );
      camera.updateProjectionMatrix();
    }
    camera.position.set(
      0,
      0,
      dims.depth / 2 + framing.distance / pose.zoom.get(),
    );
  });
  return null;
}

/** Gira o livro pela pose; cada mudança de valor pede um quadro novo. */
function PoseGroup({
  pose,
  children,
}: {
  pose: PoseValues;
  children: React.ReactNode;
}) {
  const group = useRef<Group>(null);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const { leaves, ...single } = pose;
    const stops = [...Object.values(single), ...leaves].map((value) =>
      value.on("change", () => invalidate()),
    );
    return () => {
      for (const stop of stops) stop();
    };
  }, [pose, invalidate]);

  // Primeiro o yaw, depois o pitch em torno do eixo da tela: arrastar para
  // cima inclina o livro para quem olha, em qualquer giro
  useFrame(() => {
    group.current?.rotation.set(
      pose.pitch.get() + pose.tiltPitch.get(),
      pose.yaw.get() + pose.tiltYaw.get(),
      0,
    );
  });

  return <group ref={group}>{children}</group>;
}

/** Avisa depois que o primeiro quadro com o livro chegou à tela. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    requestAnimationFrame(() => onReady());
  });
  return null;
}

/** Contexto do WebGL perdido (comum no celular): vira erro, com "Tentar de novo". */
function ContextLossGuard() {
  const gl = useThree((state) => state.gl);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const canvas = gl.domElement;
    function onLost(event: Event) {
      event.preventDefault();
      setLost(true);
    }
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [gl]);

  if (lost) throw new Error("O contexto do WebGL caiu");
  return null;
}
