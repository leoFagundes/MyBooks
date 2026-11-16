"use client";

import {
  animate,
  type MotionValue,
  motion,
  useAnimationFrame,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { BookCover } from "@/features/books/components/book-cover";
import type { BookVisual } from "@/features/books/types";
import { SceneBoundary } from "@/features/viewer-3d/components/scene-boundary";
import {
  cameraDistance,
  FLOAT_PX,
  FLOAT_TURN,
  type LandingStart,
  landingDimensions,
  landingStart,
  landingTime,
  PX,
  wave,
} from "@/features/viewer-3d/lib/landing-layout";
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

// Rolando antes de a cena chegar, as capas saem neste trecho da história:
// elas não voam até a prateleira
const COVERS_OUT = 0.03;

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
 *
 * Até a cena chegar (o three é pesado), as capas de verdade seguram o lugar:
 * cada uma onde o livro 3D vai estar, do mesmo tamanho, no mesmo giro e na
 * mesma onda. Quando a cena aparece por cima, elas saem; com movimento
 * reduzido, ou se a cena falhar, ficam paradas.
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
  const [covered, setCovered] = useState(false);
  useMotionValueEvent(appear, "change", (value) => {
    if (value >= 1) setCovered(true);
  });
  const shown = books.slice(0, slots.length);

  return (
    <div
      ref={box}
      aria-hidden
      // Fora da história, só o trecho do título, abaixo da barra (h-14)
      className="pointer-events-none absolute inset-0 historia-parada:top-14 historia-parada:bottom-auto historia-parada:h-[calc(88svh-3.5rem)]"
    >
      {size && !covered ? (
        <HeroCovers
          books={shown}
          slots={slots}
          targets={story ? targets : null}
          avoid={story ? null : blocks}
          stage={size}
          wide={wide}
          still={reduced ?? false}
          appear={appear}
          progress={story ? progress : null}
        />
      ) : null}
      <motion.div
        style={{ opacity: story ? storyOpacity : appear }}
        className="absolute inset-0"
      >
        {ready ? (
          <SceneBoundary onError={() => undefined}>
            <LandingScene
              books={shown}
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
    </div>
  );
}

type CoverPlan = {
  book: BookVisual;
  start: LandingStart;
  width: number;
  height: number;
  /** A distância da câmera até o livro, em px: a perspectiva do giro. */
  perspective: number;
};

// O giro do three (y para cima) em CSS (y para baixo): o y e o z trocam de
// sinal; o balanço da onda vem depois do giro de partida, como na cena
function coverTransform({ start, perspective }: CoverPlan, time: number) {
  const [wx, wy, wPitch, wYaw, wRoll] = start.waves;
  const float = FLOAT_PX * start.scale;
  const x = wave(time, wx) * float;
  const y = -wave(time, wy) * float;
  const pitch = wave(time, wPitch) * FLOAT_TURN * 0.6;
  const yaw = wave(time, wYaw) * FLOAT_TURN;
  const roll = wave(time, wRoll) * FLOAT_TURN * 0.5;
  return `translate3d(${x}px, ${y}px, 0) perspective(${perspective}px) rotateY(${start.yaw}rad) rotateX(${-start.pitch}rad) rotateZ(${-start.roll}rad) rotateY(${yaw}rad) rotateX(${-pitch}rad) rotateZ(${-roll}rad)`;
}

/**
 * As capas que seguram o lugar dos livros 3D enquanto a cena carrega: as
 * mesmas contas da cena (landing-layout), a mesma onda no mesmo relógio. A
 * cena aparece por cima e elas saem na segunda metade dessa entrada, já
 * cobertas; rolando antes disso (na história), saem também.
 */
function HeroCovers({
  books,
  slots,
  targets,
  avoid,
  stage,
  wide,
  still,
  appear,
  progress,
}: {
  books: BookVisual[];
  slots: typeof WIDE_SLOTS;
  targets: Target[] | null;
  avoid: Block[] | null;
  stage: Size;
  wide: boolean;
  still: boolean;
  appear: MotionValue<number>;
  progress: MotionValue<number> | null;
}) {
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  const enter = useMotionValue(0);
  const opacity = useTransform(() => {
    const leaving = Math.max(0, appear.get() * 2 - 1);
    const scrolled = progress
      ? Math.min(1, Math.max(0, progress.get() / COVERS_OUT))
      : 0;
    return enter.get() * (1 - leaving) * (1 - scrolled);
  });
  const distance = cameraDistance(stage.height) * PX;
  const plans = books.flatMap((book, index): CoverPlan[] => {
    const slot = slots[index];
    // Na história, como na cena, só quem tem lombada
    if (!slot || (targets && targets[index] === undefined)) return [];
    const dims = landingDimensions(book);
    const start = landingStart(book, slot, !targets, avoid, dims, stage, wide);
    if (!start) return [];
    return [
      {
        book,
        start,
        width: dims.width * PX * start.scale,
        height: dims.height * PX * start.scale,
        perspective: distance / start.scale,
      },
    ];
  });

  useEffect(() => {
    const controls = animate(enter, 1, tweens.base);
    return () => controls.stop();
  }, [enter]);

  useAnimationFrame(() => {
    const time = still ? 0 : landingTime();
    plans.forEach((plan, index) => {
      const node = nodes.current[index];
      if (node) node.style.transform = coverTransform(plan, time);
    });
  });

  return (
    <motion.div style={{ opacity }} className="absolute inset-0">
      {plans.map((plan, index) => (
        <div
          key={plan.book.id}
          ref={(node) => {
            nodes.current[index] = node;
          }}
          className="absolute"
          style={{
            left: plan.start.x - plan.width / 2,
            top: plan.start.y - plan.height / 2,
            width: plan.width,
          }}
        >
          <BookCover book={plan.book} size="fan" tilt={false} />
        </div>
      ))}
    </motion.div>
  );
}
