import type { MotionValue } from "motion/react";
import type { CommunityQuote } from "@/features/books/queries";
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
  /**
   * Deslize do livro aberto, em unidades do mundo, dentro do giro: com as
   * duas páginas na tela, o livro gira em torno do meio delas.
   */
  shift: MotionValue<number>;
  tiltYaw: MotionValue<number>;
  tiltPitch: MotionValue<number>;
  /** Cada folha, de 0 (à direita) a 1 (virada para a esquerda). */
  leaves: MotionValue<number>[];
};

/**
 * Pose de 3/4 depois da chegada: a lombada à vista e um pouco do topo. A
 * câmera fica na altura do meio do livro, então o topo só aparece com o
 * livro inclinado mais de uns 10°.
 */
export const SETTLE_POSE = { yaw: 0.5, pitch: 0.28 } as const;

/** O que a cena 3D recebe do visualizador. */
export type SceneProps = {
  book: BookVisual;
  description: string | null;
  /** Citações da comunidade: a primeira vai para a folha de rosto. */
  quotes: CommunityQuote[];
  dims: BookDimensions;
  framing: Framing;
  pose: PoseValues;
  /** A cena desenhou o primeiro quadro com o livro pronto. */
  onReady: () => void;
};
