"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import type { BookPose } from "./use-book-pose";

// Até onde um toque ainda é toque, e não arraste
const TAP_SLOP = 10;
const TAP_MS = 300;
const DOUBLE_TAP_MS = 300;
// A velocidade ao soltar vem dos últimos 80ms do arraste
const VELOCITY_WINDOW_MS = 80;
const STILL_MS = 50;
const WHEEL_ZOOM = 0.0015;
// Firefox manda a roda em linhas
const LINE_HEIGHT = 16;

type Sample = { x: number; y: number; time: number };

/**
 * Os gestos do palco: arrastar gira (um dedo ou o mouse), a pinça e a roda
 * aproximam, e o duplo clique ou o toque duplo voltam ao começo. Pointer
 * Events com captura, para o arraste seguir fora do palco; o palco tem
 * touch-action: none, e o navegador não rola nem dá zoom na página.
 */
export function useStageGestures(
  stage: React.RefObject<HTMLElement | null>,
  pose: BookPose,
  enabled: boolean,
) {
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const press = useRef<(Sample & { moved: boolean }) | null>(null);
  const samples = useRef<Sample[]>([]);
  const lastTap = useRef<Sample | null>(null);

  const onWheel = useEffectEvent((event: WheelEvent) => {
    // Sem isto, a roda rolaria a página por trás do diálogo
    event.preventDefault();
    const delta =
      event.deltaMode === 1 ? event.deltaY * LINE_HEIGHT : event.deltaY;
    // A pinça do trackpad chega como roda com ctrl, em passos menores
    pose.zoomBy(Math.exp(-delta * WHEEL_ZOOM * (event.ctrlKey ? 4 : 1)));
  });

  // O onWheel do React é passivo e não deixa cancelar a rolagem. A roda só
  // entra com o livro pronto: antes disso, o portal do Radix nem montou o palco
  useEffect(() => {
    const element = stage.current;
    if (!element || !enabled) return;
    const listener = (event: WheelEvent) => onWheel(event);
    element.addEventListener("wheel", listener, { passive: false });
    return () => element.removeEventListener("wheel", listener);
  }, [stage, enabled]);

  function distance() {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  function restartSamples(point: { x: number; y: number }, time: number) {
    samples.current = [{ ...point, time }];
  }

  function onPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (!enabled) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);
    if (pointers.current.size === 1) {
      pose.grab();
      press.current = { ...point, time: event.timeStamp, moved: false };
      restartSamples(point, event.timeStamp);
    } else if (pointers.current.size === 2) {
      pinch.current = distance();
      if (press.current) press.current.moved = true;
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous || !enabled) return;
    const point = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, point);

    if (pointers.current.size >= 2) {
      const current = distance();
      if (pinch.current) pose.zoomBy(current / pinch.current);
      pinch.current = current;
      return;
    }

    const start = press.current;
    if (
      start &&
      !start.moved &&
      Math.hypot(point.x - start.x, point.y - start.y) > TAP_SLOP
    ) {
      start.moved = true;
    }
    pose.drag(point.x - previous.x, point.y - previous.y);
    samples.current.push({ ...point, time: event.timeStamp });
    while (
      samples.current.length > 2 &&
      event.timeStamp - samples.current[0].time > VELOCITY_WINDOW_MS
    ) {
      samples.current.shift();
    }
  }

  function onTouchTap(tap: Sample) {
    const previous = lastTap.current;
    if (
      previous &&
      tap.time - previous.time < DOUBLE_TAP_MS &&
      Math.hypot(tap.x - previous.x, tap.y - previous.y) < TAP_SLOP * 3
    ) {
      lastTap.current = null;
      pose.reset();
      return;
    }
    lastTap.current = tap;
  }

  function onPointerUp(event: React.PointerEvent<HTMLElement>) {
    if (!pointers.current.delete(event.pointerId)) return;
    // Um dedo saiu da pinça: o outro continua girando dali
    if (pointers.current.size === 1) {
      pinch.current = null;
      const [remaining] = [...pointers.current.values()];
      restartSamples(remaining, event.timeStamp);
      return;
    }
    if (pointers.current.size > 0) return;

    pinch.current = null;
    const start = press.current;
    press.current = null;
    if (!enabled || !start) return;

    if (!start.moved && event.timeStamp - start.time < TAP_MS) {
      // No mouse, quem cuida do duplo clique é o dblclick
      if (event.pointerType !== "mouse") {
        onTouchTap({
          x: event.clientX,
          y: event.clientY,
          time: event.timeStamp,
        });
      }
      return;
    }

    const first = samples.current[0];
    const last = samples.current.at(-1);
    const seconds = first && last ? (last.time - first.time) / 1000 : 0;
    if (
      !first ||
      !last ||
      seconds <= 0 ||
      event.timeStamp - last.time > STILL_MS
    ) {
      pose.release(0, 0);
      return;
    }
    pose.release((last.x - first.x) / seconds, (last.y - first.y) / seconds);
  }

  function onDoubleClick() {
    if (enabled) pose.reset();
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onDoubleClick,
  };
}
