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
import { useEffect, useRef, useState } from "react";
import type { BookVisual } from "@/features/books/types";
import { SceneBoundary } from "@/features/viewer-3d/components/scene-boundary";
import { tweens } from "@/lib/motion";
import { useMediaQuery } from "@/lib/use-media-query";
import { FLIGHT, HIDE_SCENE, NARROW_SLOTS, WIDE_SLOTS } from "../lib/story";

// three, R3F e drei chegam só depois do título, que é o LCP
const LandingScene = dynamic(
  () => import("@/features/viewer-3d/scene/landing-scene"),
  { ssr: false },
);

const WIDE = "(min-width: 640px)";
// Espera o navegador sossegar depois da carga, para a cena não disputar com o
// título e as primeiras imagens
const IDLE_TIMEOUT_MS = 1500;
// A folga entre o texto do título e os livros que flutuam em volta dele, em px
const TEXT_GAP = 12;

type Size = { width: number; height: number };
type Target = { x: number; y: number; width: number; height: number };
type Block = { left: number; right: number; top: number; bottom: number };

/**
 * Os livros 3D do topo da landing. No computador, com a história (story),
 * cobrem o palco e voam até as lombadas de verdade da prateleira, medidas na
 * página; fora dele, só flutuam no trecho do título, abaixo da barra e fora
 * dos blocos de texto (`data-hero-text`). A cena carrega quando o navegador
 * sossega e para de desenhar fora da tela e depois da troca pela prateleira
 * da página. Com movimento reduzido, não há cena.
 */
export function HeroBooks({
  books,
  progress,
  story,
  shelf,
  text,
}: {
  books: BookVisual[];
  /** A história amortecida, a mesma que move o palco. */
  progress: MotionValue<number>;
  story: boolean;
  shelf: React.RefObject<HTMLDivElement | null>;
  /** O trecho do título, com os blocos de texto marcados. */
  text: React.RefObject<HTMLDivElement | null>;
}) {
  const reduced = useReducedMotion();
  const wide = useMediaQuery(WIDE);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [idle, setIdle] = useState(false);
  const [inView, setInView] = useState(true);
  const [beforeHide, setBeforeHide] = useState(
    () => progress.get() < (HIDE_SCENE[1] ?? 1),
  );
  const appear = useMotionValue(0);
  // A prateleira da página já cobre os livros 3D (inteiros) quando a cena
  // some: nada de os dois meio transparentes ao mesmo tempo
  const hide = useTransform(progress, HIDE_SCENE, [0, 1]);
  const storyOpacity = useTransform(() => appear.get() * (1 - hide.get()));
  const slots = wide ? WIDE_SLOTS : NARROW_SLOTS;

  useMotionValueEvent(progress, "change", (value) =>
    setBeforeHide(value < (HIDE_SCENE[1] ?? 1)),
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
    const node = box.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry?.isIntersecting ?? true),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // O palco da cena é esta caixa: o palco inteiro na história, só o trecho
  // do título fora dela. As lombadas ficam medidas nas coordenadas dela
  useEffect(() => {
    const node = box.current;
    const shelfNode = shelf.current;
    const textNode = text.current;
    if (!node) return;
    function measure() {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
      const spines = [
        ...(shelfNode?.querySelectorAll<HTMLElement>("a.spine") ?? []),
      ];
      setTargets(
        spines
          .map((spine) => spine.getBoundingClientRect())
          .filter((spine) => spine.width > 0)
          .map((spine) => ({
            x: spine.left - rect.left + spine.width / 2,
            y: spine.top - rect.top + spine.height / 2,
            width: spine.width,
            height: spine.height,
          })),
      );
      setBlocks(
        [
          ...(textNode?.querySelectorAll<HTMLElement>("[data-hero-text]") ??
            []),
        ].map((block) => {
          const edges = block.getBoundingClientRect();
          return {
            left: edges.left - rect.left - TEXT_GAP,
            right: edges.right - rect.left + TEXT_GAP,
            top: edges.top - rect.top - TEXT_GAP,
            bottom: edges.bottom - rect.top + TEXT_GAP,
          };
        }),
      );
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    if (shelfNode) observer.observe(shelfNode);
    if (textNode) observer.observe(textNode);
    void document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, [shelf, text, story, wide]);

  const ready =
    !reduced && idle && size !== null && (!story || targets.length > 0);
  return (
    <motion.div
      ref={box}
      aria-hidden
      style={{ opacity: story ? storyOpacity : appear }}
      // Fora da história, só o trecho do título, abaixo da barra (h-14)
      className="pointer-events-none absolute inset-0 historia-parada:top-14 historia-parada:bottom-auto historia-parada:h-[calc(88svh-3.5rem)]"
    >
      {ready ? (
        <SceneBoundary onError={() => undefined}>
          <LandingScene
            books={books.slice(0, slots.length)}
            slots={slots}
            targets={story ? targets : null}
            avoid={story ? null : blocks}
            stage={size}
            wide={wide}
            flight={FLIGHT}
            progress={progress}
            active={inView && (!story || beforeHide)}
            onReady={() => animate(appear, 1, tweens.slow)}
          />
        </SceneBoundary>
      ) : null}
    </motion.div>
  );
}
