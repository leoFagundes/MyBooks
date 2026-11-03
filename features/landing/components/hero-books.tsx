"use client";

import {
  animate,
  type MotionValue,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { BookVisual } from "@/features/books/types";
import { SceneBoundary } from "@/features/viewer-3d/components/scene-boundary";
import { tweens } from "@/lib/motion";
import { useMediaQuery } from "@/lib/use-media-query";
import { FLIGHT, NARROW_SLOTS, SWAP, WIDE_SLOTS } from "../lib/story";

// three, R3F e drei chegam só depois do título, que é o LCP
const LandingScene = dynamic(
  () => import("@/features/viewer-3d/scene/landing-scene"),
  { ssr: false },
);

const WIDE = "(min-width: 640px)";
// Espera o navegador sossegar depois da carga, para a cena não disputar com o
// título e as primeiras imagens
const IDLE_TIMEOUT_MS = 1500;

type Target = { x: number; y: number; width: number; height: number };
type Layout = { width: number; height: number; targets: Target[] };

/**
 * Os livros 3D do topo da landing. Mede as lombadas de verdade da prateleira
 * (o destino de cada livro), carrega a cena quando o navegador sossega e a
 * pausa fora da tela e depois da troca pela prateleira da página. Com
 * movimento reduzido, não há cena: o CSS monta a história parada.
 */
export function HeroBooks({
  books,
  progress,
  section,
  stage,
  shelf,
}: {
  books: BookVisual[];
  progress: MotionValue<number>;
  section: React.RefObject<HTMLElement | null>;
  stage: React.RefObject<HTMLDivElement | null>;
  shelf: React.RefObject<HTMLDivElement | null>;
}) {
  const reduced = useReducedMotion();
  const wide = useMediaQuery(WIDE);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [idle, setIdle] = useState(false);
  const [inView, setInView] = useState(true);
  const [beforeSwap, setBeforeSwap] = useState(progress.get() < SWAP[1]);
  const appear = useMotionValue(0);
  const swap = useTransform(progress, SWAP, [1, 0]);
  const opacity = useTransform(() => appear.get() * swap.get());
  const slots = wide ? WIDE_SLOTS : NARROW_SLOTS;

  useMotionValueEvent(progress, "change", (value) =>
    setBeforeSwap(value < (SWAP[1] ?? 1)),
  );

  useEffect(() => {
    const request =
      window.requestIdleCallback ??
      ((callback: () => void) => window.setTimeout(callback, 600));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = request(() => setIdle(true), { timeout: IDLE_TIMEOUT_MS });
    return () => cancel(id);
  }, []);

  useEffect(() => {
    const node = section.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry?.isIntersecting ?? true),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [section]);

  useEffect(() => {
    const stageNode = stage.current;
    const shelfNode = shelf.current;
    if (!stageNode || !shelfNode) return;
    function measure() {
      if (!stageNode || !shelfNode) return;
      const box = stageNode.getBoundingClientRect();
      const spines = [...shelfNode.querySelectorAll<HTMLElement>("a.spine")];
      const targets = spines
        .map((spine) => spine.getBoundingClientRect())
        .filter((rect) => rect.width > 0)
        .map((rect) => ({
          x: rect.left - box.left + rect.width / 2,
          y: rect.top - box.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
        }));
      setLayout({ width: box.width, height: box.height, targets });
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stageNode);
    observer.observe(shelfNode);
    void document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, [stage, shelf, wide]);

  if (reduced || !layout || !idle) return null;
  return (
    <motion.div
      aria-hidden
      style={{ opacity }}
      className="pointer-events-none absolute inset-0 motion-reduce:hidden"
    >
      <SceneBoundary onError={() => undefined}>
        <LandingScene
          books={books.slice(0, slots.length)}
          slots={slots}
          targets={layout.targets}
          stage={layout}
          wide={wide}
          flight={FLIGHT}
          progress={progress}
          active={inView && beforeSwap}
          onReady={() => animate(appear, 1, tweens.slow)}
        />
      </SceneBoundary>
    </motion.div>
  );
}
