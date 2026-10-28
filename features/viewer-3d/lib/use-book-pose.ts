"use client";

import {
  animate,
  cancelFrame,
  frame,
  type MotionValue,
  motionValue,
  type Transition,
} from "motion/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { springs, tweens } from "@/lib/motion";
import type { OpenFraming } from "./framing";
import { type PoseValues, SETTLE_POSE } from "./types";

const TURN = 2 * Math.PI;
// Arrastar: radianos por px; soltar projeta a velocidade por 0,12s
const DRAG_YAW = 0.01;
const DRAG_PITCH = 0.006;
const FLING_SECONDS = 0.12;
const PITCH_LIMIT = 0.6;
const ZOOM_MIN = 0.7;
const ZOOM_MAX = 2.2;
// Setas: 30° para os lados, 15° para cima e para baixo
const STEP_YAW = Math.PI / 6;
const STEP_PITCH = Math.PI / 12;
// Girar: uma volta a cada ~10s
const SPIN_SPEED = 0.6;
// Teto para esperar uma mola: animação interrompida não avisa que terminou
const SETTLE_TIMEOUT_MS = 700;
// Aberto, o livro gira pouco: o verso das páginas não tem o que mostrar
const OPEN_YAW_LIMIT = 0.6;
const OPEN_PITCH_LIMIT = 0.35;
// A capa começa a girar quando o livro já está quase de frente
const OPEN_DELAY = 0.12;

export type BookPose = {
  values: PoseValues;
  /** O giro contínuo do botão Girar está ligado. */
  spinning: boolean;
  /** Começo de um arraste: os alvos partem de onde o livro está, e o giro para. */
  grab: () => void;
  /** Arraste, em px desde o último movimento. */
  drag: (dx: number, dy: number) => void;
  /** Fim do arraste, com a velocidade em px/s. */
  release: (vx: number, vy: number) => void;
  step: (direction: "left" | "right" | "up" | "down") => void;
  zoomBy: (factor: number) => void;
  /** Volta à pose de 3/4, pelo caminho mais curto, e para o giro. */
  reset: () => void;
  /** Vai para a pose de 3/4 (a chegada). */
  settle: () => void;
  /** Livro de frente, sem zoom: o começo da volta para a página. */
  toFront: () => Promise<void>;
  setSpinning: (on: boolean) => void;
  /** A inclinação do aparelho, somada à pose. */
  setTilt: (yaw: number, pitch: number) => void;
  /** A capa está aberta na folha de rosto. */
  opened: boolean;
  /** Abre (de frente, com o zoom e o deslize do enquadramento) ou fecha. */
  setOpen: (open: boolean, frame: OpenFraming) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** O ângulo equivalente a `angle` (a menos de voltas inteiras) mais perto de `from`. */
function nearest(angle: number, from: number) {
  return angle + Math.round((from - angle) / TURN) * TURN;
}

function settled(animations: PromiseLike<unknown>[]) {
  return Promise.race([
    Promise.all(animations).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, SETTLE_TIMEOUT_MS)),
  ]);
}

/**
 * A pose do livro no visualizador. Cada gesto move um alvo, e o valor vai até
 * ele com uma mola de lib/motion.ts: snappy no arraste e no zoom, smooth ao
 * soltar e nas setas, gentle na chegada e no recomeço. Com movimento
 * reduzido, as molas viram salto, como faz o MotionConfig.
 */
export function useBookPose(reduced: boolean): BookPose {
  const [values] = useState<PoseValues>(() => ({
    yaw: motionValue(0),
    pitch: motionValue(0),
    zoom: motionValue(1),
    open: motionValue(0),
    shift: motionValue(0),
    tiltYaw: motionValue(0),
    tiltPitch: motionValue(0),
  }));
  const [spin] = useState(() => motionValue(0));
  const [spinning, setSpinningState] = useState(false);
  const [opened, setOpened] = useState(false);
  const spinOn = useRef(false);
  const targets = useRef({ yaw: 0, pitch: 0, zoom: 1 });
  const spinLoop = useRef<((data: { delta: number }) => void) | null>(null);
  // Aberto: até onde o giro vai, em torno da volta em que o livro abriu
  const openLimits = useRef<{ base: number } | null>(null);

  function limit(target: { yaw: number; pitch: number }) {
    const open = openLimits.current;
    if (open) {
      target.yaw = clamp(
        target.yaw,
        open.base - OPEN_YAW_LIMIT,
        open.base + OPEN_YAW_LIMIT,
      );
    }
    const pitch = open ? OPEN_PITCH_LIMIT : PITCH_LIMIT;
    target.pitch = clamp(target.pitch, -pitch, pitch);
  }

  function to(
    value: MotionValue<number>,
    target: number,
    transition: Transition,
  ): Promise<void> {
    if (reduced) {
      value.jump(target);
      return Promise.resolve();
    }
    return animate(value, target, transition).finished.then(() => undefined);
  }

  function stopSpinLoop() {
    spinOn.current = false;
    if (spinLoop.current) cancelFrame(spinLoop.current);
    spinLoop.current = null;
    spin.jump(0);
  }

  // O giro anda o alvo a cada quadro. A velocidade sobe com mola e desce com
  // a curva padrão: uma mola passaria do zero, e o livro daria ré
  function startSpinLoop() {
    spinOn.current = true;
    if (spinLoop.current) return;
    values.yaw.stop();
    targets.current.yaw = values.yaw.get();
    const tick = ({ delta }: { delta: number }) => {
      const speed = spin.get();
      if (!spinOn.current && Math.abs(speed) < 1e-3) {
        stopSpinLoop();
        return;
      }
      targets.current.yaw += (speed * delta) / 1000;
      values.yaw.set(targets.current.yaw);
    };
    spinLoop.current = tick;
    frame.update(tick, true);
  }

  const stopOnUnmount = useEffectEvent(() => stopSpinLoop());
  useEffect(() => () => stopOnUnmount(), []);

  function setSpinning(on: boolean) {
    setSpinningState(on);
    if (on) {
      startSpinLoop();
      to(spin, SPIN_SPEED, springs.gentle);
    } else {
      spinOn.current = false;
      to(spin, 0, tweens.slow);
    }
  }

  function grab() {
    setSpinningState(false);
    stopSpinLoop();
    targets.current = {
      yaw: values.yaw.get(),
      pitch: values.pitch.get(),
      zoom: targets.current.zoom,
    };
  }

  function drag(dx: number, dy: number) {
    const target = targets.current;
    target.yaw += dx * DRAG_YAW;
    target.pitch += dy * DRAG_PITCH;
    limit(target);
    to(values.yaw, target.yaw, springs.snappy);
    to(values.pitch, target.pitch, springs.snappy);
  }

  function release(vx: number, vy: number) {
    const target = targets.current;
    target.yaw += vx * DRAG_YAW * FLING_SECONDS;
    target.pitch += vy * DRAG_PITCH * FLING_SECONDS;
    limit(target);
    to(values.yaw, target.yaw, springs.smooth);
    to(values.pitch, target.pitch, springs.smooth);
  }

  // As setas somam no alvo, e não no valor que a mola ainda está levando:
  // duas setas seguidas dão 60°
  function step(direction: "left" | "right" | "up" | "down") {
    // Com o giro andando (ou desacelerando), o laço é quem move o alvo
    if (spinLoop.current) grab();
    const target = targets.current;
    if (direction === "left" || direction === "right") {
      target.yaw += direction === "right" ? STEP_YAW : -STEP_YAW;
    } else {
      target.pitch += direction === "down" ? STEP_PITCH : -STEP_PITCH;
    }
    limit(target);
    to(values.yaw, target.yaw, springs.smooth);
    to(values.pitch, target.pitch, springs.smooth);
  }

  function zoomBy(factor: number) {
    const target = targets.current;
    target.zoom = clamp(target.zoom * factor, ZOOM_MIN, ZOOM_MAX);
    to(values.zoom, target.zoom, springs.snappy);
  }

  function goTo(yaw: number, pitch: number, transition: Transition) {
    setSpinningState(false);
    stopSpinLoop();
    targets.current = {
      yaw: nearest(yaw, values.yaw.get()),
      pitch,
      zoom: 1,
    };
    return [
      to(values.yaw, targets.current.yaw, transition),
      to(values.pitch, pitch, transition),
      to(values.zoom, 1, transition),
    ];
  }

  function settle() {
    goTo(SETTLE_POSE.yaw, SETTLE_POSE.pitch, springs.gentle);
  }

  function close(transition: Transition) {
    setOpened(false);
    openLimits.current = null;
    return [to(values.open, 0, transition), to(values.shift, 0, transition)];
  }

  function reset() {
    close(springs.smooth);
    settle();
  }

  function setOpen(open: boolean, frame: OpenFraming) {
    if (!open) {
      reset();
      return;
    }
    setOpened(true);
    setSpinningState(false);
    stopSpinLoop();
    const yaw = nearest(0, values.yaw.get());
    openLimits.current = { base: yaw };
    targets.current = { yaw, pitch: 0, zoom: frame.zoom };
    to(values.yaw, yaw, springs.smooth);
    to(values.pitch, 0, springs.smooth);
    to(values.zoom, frame.zoom, springs.smooth);
    to(values.shift, frame.shiftX, springs.smooth);
    // A capa gira pela dobra com a mola gentle: passa um pouco e assenta
    to(values.open, 1, { ...springs.gentle, delay: OPEN_DELAY });
  }

  function toFront() {
    return settled([
      ...goTo(0, 0, springs.snappy),
      ...close(springs.snappy),
      to(values.tiltYaw, 0, springs.snappy),
      to(values.tiltPitch, 0, springs.snappy),
    ]);
  }

  function setTilt(yaw: number, pitch: number) {
    to(values.tiltYaw, yaw, springs.snappy);
    to(values.tiltPitch, pitch, springs.snappy);
  }

  return {
    values,
    spinning,
    grab,
    drag,
    release,
    step,
    zoomBy,
    reset,
    settle,
    toFront,
    setSpinning,
    setTilt,
    opened,
    setOpen,
  };
}
