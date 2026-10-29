"use client";

import { ArrowDown } from "lucide-react";
import {
  animate,
  cubicBezier,
  type MotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { splitWords } from "@/components/motion/split-words";
import { Button } from "@/components/ui/button";
import { Shelf } from "@/features/books/components/shelf";
import type { BookVisual } from "@/features/books/types";
import { ProfileHeader } from "@/features/profile/components/profile-header";
import { easing, springs, staggerDelay, tweens } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { CAN_HOVER, useMediaQuery } from "@/lib/use-media-query";
import type { LandingShowcase } from "../queries";
import { BookBox } from "./book-box";

const TITLE = "Sua vida de leitor, em uma estante só.";
const WIDE = "(min-width: 640px)";
const ease = cubicBezier(...easing);

// Onde cada capa flutua no começo: x e y em fração do palco, e a
// profundidade (perto é maior e nítido; longe, menor e um pouco desfocado)
type Slot = { x: number; y: number; depth: number };
const WIDE_SLOTS: Slot[] = [
  { x: 0.08, y: 0.2, depth: 0.8 },
  { x: 0.2, y: 0.1, depth: 1 },
  { x: 0.35, y: 0.15, depth: 0.62 },
  { x: 0.65, y: 0.12, depth: 0.7 },
  { x: 0.8, y: 0.1, depth: 1.05 },
  { x: 0.93, y: 0.26, depth: 0.78 },
  { x: 0.06, y: 0.58, depth: 1.08 },
  { x: 0.94, y: 0.62, depth: 0.92 },
  { x: 0.14, y: 0.88, depth: 0.72 },
  { x: 0.32, y: 0.94, depth: 0.95 },
  { x: 0.7, y: 0.92, depth: 0.66 },
  { x: 0.86, y: 0.86, depth: 1.1 },
];
const NARROW_SLOTS: Slot[] = [
  { x: 0.12, y: 0.12, depth: 0.9 },
  { x: 0.4, y: 0.07, depth: 0.66 },
  { x: 0.66, y: 0.1, depth: 1 },
  { x: 0.92, y: 0.15, depth: 0.74 },
  { x: 0.08, y: 0.88, depth: 0.76 },
  { x: 0.36, y: 0.94, depth: 1.02 },
  { x: 0.64, y: 0.91, depth: 0.7 },
  { x: 0.9, y: 0.86, depth: 0.94 },
];

// A história, em trechos da rolagem da seção (0 a 1)
const TITLE_OUT = [0.03, 0.18];
const FLIGHT_START = 0.08;
const FLIGHT_SPREAD = 0.22;
const FLIGHT_LENGTH = 0.32;
const LINE = [0.48, 0.62];
const SWAP = [0.63, 0.69];
const PROFILE = [0.69, 0.82];

type Target = { x: number; y: number; width: number; height: number };
type Layout = { width: number; height: number; targets: Target[] };

/** Entrada só em CSS: o título aparece sem esperar o JavaScript (é o LCP). */
const entering =
  "animate-[pagina-entra_var(--duration-slow)_var(--ease-standard)_both] motion-reduce:animate-[aparecer_var(--duration-slow)_var(--ease-standard)_both]";
const delay = (step: number) => ({
  animationDelay: `${Math.round(step * staggerDelay * 1000)}ms`,
});

function FlyingBook({
  book,
  index,
  total,
  slot,
  target,
  stage,
  wide,
  progress,
  mouseX,
  mouseY,
}: {
  book: BookVisual;
  index: number;
  total: number;
  slot: Slot;
  target: Target;
  stage: { width: number; height: number };
  wide: boolean;
  progress: MotionValue<number>;
  mouseX: MotionValue<number>;
  mouseY: MotionValue<number>;
}) {
  const width = target.height / 1.5;
  const begin =
    FLIGHT_START + (total > 1 ? (index / (total - 1)) * FLIGHT_SPREAD : 0);
  const flight = useTransform(
    progress,
    [begin, begin + FLIGHT_LENGTH],
    [0, 1],
    {
      ease,
    },
  );
  // O tamanho do palco muda (giro do celular, fontes chegando) sem remontar
  const geometry = useMotionValue({
    startX: slot.x * stage.width,
    startY: slot.y * stage.height,
    target,
  });
  useEffect(() => {
    geometry.set({
      startX: slot.x * stage.width,
      startY: slot.y * stage.height,
      target,
    });
  }, [geometry, slot, stage, target]);

  // Solta, a capa segue o mouse conforme a profundidade; voando, vai largando
  const x = useTransform(() => {
    const k = flight.get();
    const { startX, target: end } = geometry.get();
    const loose = startX + mouseX.get() * 28 * slot.depth * (1 - k);
    return loose + (end.x - loose) * k - width / 2;
  });
  const y = useTransform(() => {
    const k = flight.get();
    const { startY, target: end } = geometry.get();
    const loose = startY + mouseY.get() * 18 * slot.depth * (1 - k);
    return loose + (end.y - loose) * k - end.height / 2;
  });
  // Girando 90°, a lombada vem para a frente; o recuo de meia capa a deixa
  // no plano da prateleira, sem a lente da perspectiva aumentar
  const rotateY = useTransform(flight, [0, 1], [0, 90]);
  const z = useTransform(flight, [0, 1], [0, -width / 2]);
  const scale = useTransform(
    flight,
    [0, 1],
    [slot.depth * (wide ? 0.95 : 0.6), 1],
  );
  const blur = slot.depth < 0.7 ? 1.5 : slot.depth < 0.85 ? 0.6 : 0;
  const filter = useTransform(flight, (k) =>
    blur > 0 && k < 1 ? `blur(${(blur * (1 - k)).toFixed(2)}px)` : "none",
  );
  // No fim, a caixa dá lugar à lombada de verdade, que fica no mesmo lugar
  const swap = useTransform(progress, SWAP, [1, 0]);
  const appear = useMotionValue(0);
  useEffect(() => {
    const controls = animate(appear, 1, {
      ...tweens.slow,
      delay: index * staggerDelay,
    });
    return () => controls.stop();
  }, [appear, index]);
  const opacity = useTransform(() => appear.get() * swap.get());

  // A posição fica num invólucro: a perspectiva da caixa nasce do centro
  // dela, e a capa solta aparece de frente, não de lado
  return (
    <motion.div
      className="absolute top-0 left-0"
      style={{ x, y, opacity, zIndex: Math.round(slot.depth * 10) }}
    >
      <BookBox
        book={book}
        height={target.height}
        spineWidth={target.width}
        style={{ z, rotateY, scale, filter, transformPerspective: 1000 }}
      />
    </motion.div>
  );
}

/**
 * As capas soltas do topo. Só no navegador e sem movimento reduzido: o
 * destino de cada uma é a lombada dela na prateleira de verdade, medida.
 */
function FloatingBooks({
  books,
  progress,
  stage,
  shelf,
}: {
  books: BookVisual[];
  progress: MotionValue<number>;
  stage: React.RefObject<HTMLDivElement | null>;
  shelf: React.RefObject<HTMLDivElement | null>;
}) {
  const reduced = useReducedMotion();
  const wide = useMediaQuery(WIDE);
  const canHover = useMediaQuery(CAN_HOVER);
  const [layout, setLayout] = useState<Layout | null>(null);
  const mouseX = useSpring(0, springs.smooth);
  const mouseY = useSpring(0, springs.smooth);
  const slots = wide ? WIDE_SLOTS : NARROW_SLOTS;
  const shown = books.slice(0, slots.length);

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

  useEffect(() => {
    if (!canHover || reduced) return;
    function follow(event: PointerEvent) {
      mouseX.set((event.clientX / window.innerWidth - 0.5) * 2);
      mouseY.set((event.clientY / window.innerHeight - 0.5) * 2);
    }
    window.addEventListener("pointermove", follow);
    return () => window.removeEventListener("pointermove", follow);
  }, [canHover, reduced, mouseX, mouseY]);

  if (reduced || !layout) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 motion-reduce:hidden"
    >
      {shown.map((book, index) => {
        const target = layout.targets[index];
        const slot = slots[index];
        if (!target || !slot) return null;
        return (
          <FlyingBook
            key={book.id}
            book={book}
            index={index}
            total={shown.length}
            slot={slot}
            target={target}
            stage={layout}
            wide={wide}
            progress={progress}
            mouseX={mouseX}
            mouseY={mouseY}
          />
        );
      })}
    </div>
  );
}

/**
 * O topo da landing (spec §5.1): o título e, em volta, capas de verdade em
 * profundidade. Rolando, as capas viram lombadas numa prateleira, que vira o
 * perfil de uma leitora. O palco fica preso por 220vh de rolagem. Com
 * movimento reduzido, o CSS monta tudo parado: título, prateleira e perfil.
 */
export function HeroStage({ showcase }: { showcase: LandingShowcase | null }) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const shelf = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start start", "end end"],
  });

  const titleOpacity = useTransform(scrollYProgress, TITLE_OUT, [1, 0]);
  const titleY = useTransform(scrollYProgress, TITLE_OUT, [0, -48]);
  const titleEvents = useTransform(titleOpacity, (value) =>
    value > 0.15 ? "auto" : "none",
  );
  const lineScale = useTransform(scrollYProgress, LINE, [0, 1]);
  const shelfOpacity = useTransform(scrollYProgress, SWAP, [0, 1]);
  const profileOpacity = useTransform(scrollYProgress, PROFILE, [0, 1]);
  const profileY = useTransform(scrollYProgress, PROFILE, [24, 0]);
  const endEvents = useTransform(profileOpacity, (value) =>
    value > 0.5 ? "auto" : "none",
  );
  const words = splitWords(TITLE);

  return (
    <section
      ref={section}
      aria-label="Apresentação"
      className="relative h-[320vh] motion-reduce:h-auto"
    >
      <div
        ref={stage}
        className="sticky top-0 h-svh overflow-hidden motion-reduce:relative motion-reduce:h-auto motion-reduce:overflow-visible"
      >
        <motion.div
          style={{
            opacity: titleOpacity,
            y: titleY,
            pointerEvents: titleEvents,
          }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-7 px-6 text-center motion-reduce:pointer-events-auto! motion-reduce:relative motion-reduce:min-h-[88svh] motion-reduce:transform-none! motion-reduce:opacity-100!"
        >
          <h1 className="max-w-4xl font-serif text-5xl leading-[1.02] tracking-tight text-balance sm:text-7xl lg:text-8xl">
            {words.map((word, index) => (
              <span key={`${word}-${index}`}>
                <span
                  className={`inline-block ${entering}`}
                  style={delay(index)}
                >
                  {word}
                </span>
                {index < words.length - 1 ? " " : null}
              </span>
            ))}
          </h1>
          <p
            className={`max-w-md text-lg text-pretty text-muted-foreground ${entering}`}
            style={delay(words.length + 2)}
          >
            Guarde o que você leu, o que está lendo e o que ainda quer ler.
            Visite a estante de outros leitores e traga para a sua o que chamar
            a sua atenção.
          </p>
          <div
            className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-3 ${entering}`}
            style={delay(words.length + 4)}
          >
            <Button size="lg" asChild>
              <Link href={routes.cadastro}>Criar minha estante</Link>
            </Button>
            <Link
              href={routes.entrar}
              className="rounded-control text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Já tenho conta
            </Link>
          </div>
          {showcase ? (
            <p
              aria-hidden
              className={`absolute bottom-8 flex items-center gap-2 font-mono text-xs text-muted-foreground motion-reduce:hidden ${entering}`}
              style={delay(words.length + 8)}
            >
              <ArrowDown className="size-3.5" strokeWidth={1.5} />
              role para ver
            </p>
          ) : null}
        </motion.div>

        {showcase ? (
          <FloatingBooks
            books={showcase.books}
            progress={scrollYProgress}
            stage={stage}
            shelf={shelf}
          />
        ) : null}

        {showcase ? (
          <motion.div
            style={{ pointerEvents: endEvents }}
            // pt-14: o fim da história centra abaixo da barra
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6 px-4 pt-14 motion-reduce:pointer-events-auto! motion-reduce:relative motion-reduce:pb-24 sm:gap-10 sm:px-6"
          >
            <motion.div
              style={{ opacity: profileOpacity, y: profileY }}
              // No celular, sem os gêneros: o fim da história cabe na tela
              className="w-full max-w-3xl motion-reduce:transform-none! motion-reduce:opacity-100! max-sm:[&_[data-genres]]:hidden"
            >
              <ProfileHeader
                profile={showcase.profile}
                counts={showcase.counts}
                titleAs="h2"
              />
            </motion.div>
            <div className="relative px-6">
              <motion.div
                ref={shelf}
                style={{ opacity: shelfOpacity }}
                className="motion-reduce:opacity-100!"
              >
                <Shelf
                  books={showcase.books}
                  label={`A estante de ${showcase.profile.displayName}`}
                  // No celular, 8 lombadas, como as capas soltas
                  className="justify-center bg-none! max-sm:[&>li:nth-child(n+9)]:hidden"
                />
              </motion.div>
              <motion.div
                aria-hidden
                style={{ scaleX: lineScale }}
                className="absolute inset-x-0 bottom-0 h-px bg-foreground/24 motion-reduce:transform-none!"
              />
            </div>
            <motion.div
              style={{ opacity: profileOpacity }}
              className="motion-reduce:opacity-100!"
            >
              <Link
                href={routes.profile(showcase.profile.username)}
                className="rounded-control font-mono text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                Ver a estante de @{showcase.profile.username} →
              </Link>
            </motion.div>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
