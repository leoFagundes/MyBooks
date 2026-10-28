import type { MotionValue } from "motion/react";
import type { BookVisual } from "@/features/books/types";
import type { BookDimensions } from "./dimensions";
import type { Framing } from "./framing";

/**
 * A pose do livro: o DOM anima estes valores com as molas de lib/motion.ts, e
 * a cena os lê a cada quadro. Ângulos em radianos; zoom 1 é o enquadramento.
 */
export type PoseValues = {
  yaw: MotionValue<number>;
  pitch: MotionValue<number>;
  zoom: MotionValue<number>;
  /** De 0 (fechado) a 1 (a capa aberta pela dobra). */
  open: MotionValue<number>;
  tiltYaw: MotionValue<number>;
  tiltPitch: MotionValue<number>;
};

/** O que a cena 3D recebe do visualizador. */
export type SceneProps = {
  book: BookVisual;
  description: string | null;
  dims: BookDimensions;
  framing: Framing;
  pose: PoseValues;
  /** A cena desenhou o primeiro quadro com o livro pronto. */
  onReady: () => void;
};
