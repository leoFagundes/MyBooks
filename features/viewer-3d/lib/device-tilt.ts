"use client";

import { useEffect, useEffectEvent } from "react";

type PermissionState = "granted" | "denied";
type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  // Só no Safari do iOS, e só dentro de um toque
  requestPermission?: () => Promise<PermissionState>;
};

// Até 0,25 rad de yaw e 0,17 de pitch, com uns 30° de inclinação do aparelho
const YAW_PER_DEGREE = 0.25 / 30;
const PITCH_PER_DEGREE = 0.17 / 30;
const MAX_YAW = 0.25;
const MAX_PITCH = 0.17;
// Em quanto tempo a linha de base acompanha uma postura nova
const BASELINE_SECONDS = 3;

function orientationEvent() {
  return DeviceOrientationEvent as OrientationEventWithPermission;
}

/**
 * Se dá para inclinar o livro com o aparelho: só no toque, com o sensor, e
 * "prompt" quando o navegador pede permissão (iOS).
 */
export function orientationSupport(): "none" | "granted" | "prompt" {
  if (typeof DeviceOrientationEvent === "undefined") return "none";
  if (!window.matchMedia("(pointer: coarse)").matches) return "none";
  return typeof orientationEvent().requestPermission === "function"
    ? "prompt"
    : "granted";
}

/** Pede a permissão do sensor. Precisa ser chamada dentro de um toque. */
export async function requestOrientation(): Promise<boolean> {
  const event = orientationEvent();
  if (typeof event.requestPermission !== "function") return true;
  try {
    // Chamada solta, sem o DeviceOrientationEvent como this, ela lança
    return (await event.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

function clamp(value: number, limit: number) {
  return Math.min(limit, Math.max(-limit, value));
}

/**
 * Inclinar o aparelho gira levemente o livro (spec §5.7), como se ele
 * estivesse parado no espaço e a tela fosse uma janela. A postura de quem
 * segura vira a linha de base, que se acomoda devagar a uma postura nova.
 */
export function useDeviceTilt(
  enabled: boolean,
  onTilt: (yaw: number, pitch: number) => void,
) {
  const tilt = useEffectEvent(onTilt);

  useEffect(() => {
    if (!enabled) return;
    let base: { x: number; y: number } | null = null;
    let last = 0;

    function onOrientation(event: DeviceOrientationEvent) {
      if (event.beta === null || event.gamma === null) return;
      // Com o aparelho deitado, os eixos do sensor trocam de papel
      const angle = screen.orientation?.angle ?? 0;
      const x =
        angle === 90 ? event.beta : angle === 270 ? -event.beta : event.gamma;
      const y =
        angle === 90 ? -event.gamma : angle === 270 ? event.gamma : event.beta;
      if (!base) {
        base = { x, y };
      } else {
        const follow = Math.min(
          1,
          (event.timeStamp - last) / 1000 / BASELINE_SECONDS,
        );
        base.x += (x - base.x) * follow;
        base.y += (y - base.y) * follow;
      }
      last = event.timeStamp;
      tilt(
        clamp(-(x - base.x) * YAW_PER_DEGREE, MAX_YAW),
        clamp(-(y - base.y) * PITCH_PER_DEGREE, MAX_PITCH),
      );
    }

    window.addEventListener("deviceorientation", onOrientation);
    return () => {
      window.removeEventListener("deviceorientation", onOrientation);
      tilt(0, 0);
    };
  }, [enabled]);
}
