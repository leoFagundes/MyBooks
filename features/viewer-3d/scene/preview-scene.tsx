"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { motionValue } from "motion/react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import type { BookVisual } from "@/features/books/types";
import { bookDimensions } from "../lib/dimensions";
import { CAMERA_FOV } from "../lib/framing";
import { type PoseValues, SETTLE_POSE } from "../lib/types";
import { BookModel } from "./book-model";
import { loadBookTextures } from "./book-textures";
import { Studio } from "./studio";

// O livro flutua um pouco acima do chão, onde fica a sombra
const FLOAT = 0.3;
// Câmera longe o bastante para o livro girar inteiro dentro do quadro
const DISTANCE = 9;
// O giro de vitrine: meia-volta lenta em torno da pose de 3/4
const SWAY = 0.45;
const SWAY_SPEED = 0.5;

/** Uma pose parada: a prévia não abre o livro nem vira folhas. */
function restingPose(): PoseValues {
  return {
    yaw: motionValue<number>(SETTLE_POSE.yaw),
    pitch: motionValue<number>(SETTLE_POSE.pitch),
    zoom: motionValue(1),
    open: motionValue(0),
    shift: motionValue(0),
    tiltYaw: motionValue(0),
    tiltPitch: motionValue(0),
    leaves: [],
  };
}

/** Gira o livro devagar, em vaivém; com movimento reduzido, fica parado em 3/4. */
function Turntable({
  still,
  children,
}: {
  still: boolean;
  children: React.ReactNode;
}) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    const sway = still ? 0 : Math.sin(clock.elapsedTime * SWAY_SPEED) * SWAY;
    group.current?.rotation.set(SETTLE_POSE.pitch, SETTLE_POSE.yaw + sway, 0);
  });
  return <group ref={group}>{children}</group>;
}

/**
 * O livro da prévia: a cor ou o estilo novo só entra quando as texturas dele
 * ficam prontas. Até lá, o livro anterior continua na tela (sem isso, o
 * Suspense o esconderia a cada troca de cor).
 */
function PreloadedModel({ book }: { book: BookVisual }) {
  const dims = useMemo(() => bookDimensions(book.pageCount), [book.pageCount]);
  const pose = useMemo(() => restingPose(), []);
  const anisotropy = useThree((state) =>
    state.gl.capabilities.getMaxAnisotropy(),
  );
  const [shown, setShown] = useState(book);

  useEffect(() => {
    let current = true;
    loadBookTextures(book, null, dims, anisotropy)
      .then(() => {
        if (current) setShown(book);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [book, dims, anisotropy]);

  return (
    <BookModel
      book={shown}
      description={null}
      quotes={[]}
      dims={bookDimensions(shown.pageCount)}
      pose={pose}
    />
  );
}

/**
 * A prévia 3D do cadastro e da edição do livro: o mesmo BookModel do
 * visualizador, com a capa, a lombada e a contracapa desenhadas na cor e no
 * estilo escolhidos. É ponto de entrada de three, como a book-scene: chega
 * por next/dynamic só quando a pessoa pede o 3D.
 */
export default function PreviewScene({
  book,
  still,
}: {
  book: BookVisual;
  still: boolean;
}) {
  const dims = bookDimensions(book.pageCount);

  return (
    <Canvas
      // Parado, desenha só quando a capa muda
      frameloop={still ? "demand" : "always"}
      dpr={[1, 2]}
      flat
      gl={{ antialias: true, alpha: true }}
      camera={{
        fov: CAMERA_FOV,
        near: 0.1,
        far: 100,
        position: [0, 0, DISTANCE],
      }}
    >
      <Studio floorY={-dims.height / 2 - FLOAT} />
      <Turntable still={still}>
        <Suspense fallback={null}>
          <PreloadedModel book={book} />
        </Suspense>
      </Turntable>
    </Canvas>
  );
}
