"use client";

import { XIcon } from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  motionValue,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import dynamic from "next/dynamic";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  Component,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { AmbientGlow } from "@/features/books/components/ambient-glow";
import { BookCover } from "@/features/books/components/book-cover";
import { bookColor } from "@/features/books/lib/color";
import type { BookVisual } from "@/features/books/types";
import { durations, springs, tweens } from "@/lib/motion";
import { bookDimensions } from "../lib/dimensions";
import { frameBook, type Rect, type Size } from "../lib/framing";
import type { PoseValues } from "../lib/types";
import { ViewerPill } from "./viewer-pill";

// three, R3F e drei só chegam quando o visualizador abre (spec §5.7)
const BookScene = dynamic(() => import("../scene/book-scene"), { ssr: false });

/** Começa a baixar a cena na intenção (mouse em cima, foco), antes do clique. */
export function preloadBookScene() {
  import("../scene/book-scene").catch(() => {
    // Sem rede agora: ao abrir, o next/dynamic tenta de novo e o erro aparece lá
  });
}

// Quanto o "Montando o livro…" espera depois do pouso para aparecer
const SLOW_SCENE_MS = 400;
const TURN = 2 * Math.PI;

type BookViewerProps = {
  book: BookVisual;
  description: string | null;
  /** A capa da página: de onde o clone sai e para onde volta. */
  sourceRef: React.RefObject<HTMLElement | null>;
  /** Quem recebe o foco quando o visualizador fecha. */
  returnFocusRef: React.RefObject<HTMLElement | null>;
  /** Pediram para fechar: começa a volta. */
  closing: boolean;
  onRequestClose: () => void;
  /** O clone pousou de volta na capa da página: pode desmontar. */
  onClosed: () => void;
};

/** A transformação que leva o clone, que mora em `home`, para cima de `from`. */
function flip(from: Rect, home: Rect) {
  return {
    x: from.left + from.width / 2 - (home.left + home.width / 2),
    y: from.top + from.height / 2 - (home.top + home.height / 2),
    scale: from.width / home.width,
  };
}

function readViewport(): Size {
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * O visualizador 3D em tela cheia (spec §5.7). A capa da página vira um
 * clone que voa até onde a capa 3D vai aparecer de frente; quando a cena
 * desenha o primeiro quadro, o clone dá lugar ao livro num crossfade. Fechar
 * faz o caminho de volta, mais rápido.
 */
export function BookViewer({
  book,
  description,
  sourceRef,
  returnFocusRef,
  closing,
  onRequestClose,
  onClosed,
}: BookViewerProps) {
  const reduced = useReducedMotion() ?? false;
  const [viewport, setViewport] = useState(readViewport);
  const dims = bookDimensions(book.pageCount);
  const framing = frameBook(viewport, dims);
  const instructionsId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(closing);

  const [pose] = useState<PoseValues>(() => ({
    yaw: motionValue(0),
    pitch: motionValue(0),
    zoom: motionValue(1),
    open: motionValue(0),
    tiltYaw: motionValue(0),
    tiltPitch: motionValue(0),
  }));
  const cloneX = useMotionValue(0);
  const cloneY = useMotionValue(0);
  const cloneScale = useMotionValue(1);
  const cloneOpacity = useMotionValue(1);
  const sceneOpacity = useMotionValue(0);
  const chrome = useMotionValue(0);

  const [landed, setLanded] = useState(false);
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useLayoutEffect(() => {
    closingRef.current = closing;
  });

  useEffect(() => {
    function onResize() {
      setViewport(readViewport());
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // A ida: o fundo cobre a página e o clone voa da capa até o centro. Com
  // movimento reduzido, o clone só aparece no lugar
  const enter = useEffectEvent(() => {
    animate(chrome, 1, tweens.base);
    const from = sourceRef.current?.getBoundingClientRect();
    if (reduced || !from || from.width === 0) {
      cloneOpacity.jump(0);
      animate(cloneOpacity, 1, tweens.base);
      return durations.base;
    }
    const start = flip(from, framing.cover);
    cloneX.jump(start.x);
    cloneY.jump(start.y);
    cloneScale.jump(start.scale);
    animate(cloneX, 0, springs.smooth);
    animate(cloneY, 0, springs.smooth);
    animate(cloneScale, 1, springs.smooth);
    return durations.slow;
  });

  useLayoutEffect(() => {
    const duration = enter();
    // A cena só monta depois do pouso: a compilação dos shaders trava a linha
    // principal por um instante, e o voo não pode engasgar
    const timer = setTimeout(() => {
      if (!closingRef.current) setLanded(true);
    }, duration * 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!landed || ready || failed) return;
    const timer = setTimeout(() => setSlow(true), SLOW_SCENE_MS);
    return () => clearTimeout(timer);
  }, [landed, ready, failed]);

  // A cena desenhou a capa 3D exatamente onde o clone está: troca um pelo outro
  const reveal = useEffectEvent(() => {
    animate(sceneOpacity, 1, tweens.base);
    animate(cloneOpacity, 0, tweens.base);
  });

  useEffect(() => {
    if (landed && ready && !closing) reveal();
  }, [landed, ready, closing]);

  // A volta: o livro fica de frente, o clone reaparece por cima dele e voa de
  // volta para a capa da página, enquanto o fundo some
  const leave = useEffectEvent(async () => {
    await Promise.all([
      animate(pose.yaw, Math.round(pose.yaw.get() / TURN) * TURN, springs.snappy),
      animate(pose.pitch, 0, springs.snappy),
      animate(pose.zoom, 1, springs.snappy),
      animate(pose.open, 0, springs.snappy),
      animate(pose.tiltYaw, 0, springs.snappy),
      animate(pose.tiltPitch, 0, springs.snappy),
    ]);
    const from = sourceRef.current?.getBoundingClientRect();
    if (reduced || !from || from.width === 0) {
      await Promise.all([
        animate(chrome, 0, tweens.fast),
        animate(sceneOpacity, 0, tweens.fast),
        animate(cloneOpacity, 0, tweens.fast),
      ]);
      onClosed();
      return;
    }
    animate(cloneOpacity, 1, tweens.fast);
    await animate(sceneOpacity, 0, tweens.fast);
    const end = flip(from, framing.cover);
    animate(chrome, 0, tweens.fast);
    await Promise.all([
      animate(cloneX, end.x, springs.snappy),
      animate(cloneY, end.y, springs.snappy),
      animate(cloneScale, end.scale, springs.snappy),
    ]);
    onClosed();
  });

  useEffect(() => {
    if (closing) void leave();
  }, [closing]);

  function retry() {
    setFailed(false);
    setReady(false);
    setSlow(false);
    setAttempt((current) => current + 1);
  }

  const authors = book.authors.join(", ");

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onRequestClose();
      }}
    >
      <DialogPrimitive.Portal>
        {/* O fundo é o Overlay: é nele que o Radix trava a rolagem da página */}
        <DialogPrimitive.Overlay asChild>
          <motion.div
            className="fixed inset-0 z-50 isolate bg-background"
            style={{ opacity: chrome }}
          >
            <AmbientGlow color={bookColor(book)} />
          </motion.div>
        </DialogPrimitive.Overlay>
        <DialogPrimitive.Content
          aria-describedby={instructionsId}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            stageRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus({ preventScroll: true });
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            onRequestClose();
          }}
          onInteractOutside={(event) => event.preventDefault()}
          className="fixed inset-0 z-50 overflow-hidden text-foreground"
        >
          <div
            ref={stageRef}
            tabIndex={0}
            role="application"
            aria-roledescription="livro em 3D"
            aria-label={`${book.title} em 3D`}
            aria-describedby={instructionsId}
            className="absolute inset-0 touch-none focus-visible:-outline-offset-4"
          >
            {landed ? (
              <motion.div
                className="absolute inset-0"
                style={{ opacity: sceneOpacity }}
              >
                <SceneBoundary key={attempt} onError={() => setFailed(true)}>
                  <BookScene
                    book={book}
                    description={description}
                    dims={dims}
                    framing={framing}
                    pose={pose}
                    onReady={() => setReady(true)}
                  />
                </SceneBoundary>
              </motion.div>
            ) : null}
          </div>

          <motion.header
            className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-0.5 px-6 pt-5"
            style={{ opacity: chrome }}
          >
            <DialogPrimitive.Title className="truncate font-serif text-xl leading-tight tracking-tight">
              {book.title}
            </DialogPrimitive.Title>
            {authors ? (
              <p className="truncate text-sm text-muted-foreground">
                {authors}
              </p>
            ) : null}
          </motion.header>

          <motion.div
            aria-hidden
            className="pointer-events-none fixed"
            style={{
              left: framing.cover.left,
              top: framing.cover.top,
              width: framing.cover.width,
              x: cloneX,
              y: cloneY,
              scale: cloneScale,
              opacity: cloneOpacity,
            }}
          >
            <BookCover book={book} size="fill" tilt={false} />
          </motion.div>

          <div
            aria-live="polite"
            className="pointer-events-none absolute inset-x-0 bottom-[calc(max(1rem,env(safe-area-inset-bottom))_+_4.25rem)] flex justify-center px-6"
          >
            <AnimatePresence>
              {failed ? (
                <motion.div
                  key="erro"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: tweens.base }}
                  exit={{ opacity: 0, transition: tweens.fast }}
                  className="pointer-events-auto flex flex-col items-center gap-3 text-center"
                >
                  <p className="text-sm text-pretty text-muted-foreground">
                    Não deu para abrir o livro em 3D neste aparelho.
                  </p>
                  <Button variant="outline" size="sm" onClick={retry}>
                    Tentar de novo
                  </Button>
                </motion.div>
              ) : slow && !ready ? (
                <motion.p
                  key="montando"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: tweens.base }}
                  exit={{ opacity: 0, transition: tweens.fast }}
                  className="text-sm text-muted-foreground"
                >
                  Montando o livro…
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>

          <motion.div style={{ opacity: chrome }}>
            <ViewerPill
              actions={[
                {
                  id: "fechar",
                  label: "Fechar",
                  icon: XIcon,
                  onClick: onRequestClose,
                  shortcut: "Esc",
                },
              ]}
            />
          </motion.div>

          <DialogPrimitive.Description id={instructionsId} className="sr-only">
            Arraste ou use as setas para girar o livro. Role ou faça pinça para
            aproximar, e dê dois cliques para voltar ao começo.
          </DialogPrimitive.Description>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Sem WebGL, chunk que não chegou ou contexto perdido: vira o estado de erro. */
class SceneBoundary extends Component<
  { onError: () => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
