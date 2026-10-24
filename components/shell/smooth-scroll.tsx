"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import { cancelFrame, frame, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

/**
 * Rolagem suave em todo o app (spec §3, momento 9). O Lenis não tem loop
 * próprio: anda no `frame` do Motion, então há um requestAnimationFrame só.
 * Com movimento reduzido, nem liga.
 */
export function SmoothScroll() {
  const reduced = useReducedMotion();
  return reduced ? null : <LenisRoot />;
}

function LenisRoot() {
  const lenis = useRef<LenisRef>(null);

  useEffect(() => {
    function update({ timestamp }: { timestamp: number }) {
      lenis.current?.lenis?.raf(timestamp);
    }
    frame.update(update, true);
    return () => cancelFrame(update);
  }, []);

  return (
    <ReactLenis
      root
      ref={lenis}
      options={{
        autoRaf: false,
        // Listas, gavetas e a paleta rolam por conta própria
        allowNestedScroll: true,
        // Clicar num link interno para a inércia antes da navegação
        stopInertiaOnNavigate: true,
        anchors: true,
      }}
    />
  );
}
