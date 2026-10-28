"use client";

import { Orbit, RotateCcw, Smartphone, XIcon } from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
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
import { cn } from "@/lib/utils";
import {
  orientationSupport,
  requestOrientation,
  useDeviceTilt,
} from "../lib/device-tilt";
import { bookDimensions } from "../lib/dimensions";
import { frameBook, type Rect, type Size } from "../lib/framing";
import { type BookPose, useBookPose } from "../lib/use-book-pose";
import { useStageGestures } from "../lib/use-stage-gestures";
import { type PillAction, ViewerPill } from "./viewer-pill";

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
const NOTICE_MS = 4000;
const ZOOM_STEP = 1.25;

// O teclado no diálogo inteiro: os botões da pílula não usam setas
const KEYS: Record<string, (pose: BookPose) => void> = {
  ArrowLeft: (pose) => pose.step("left"),
  ArrowRight: (pose) => pose.step("right"),
  ArrowUp: (pose) => pose.step("up"),
  ArrowDown: (pose) => pose.step("down"),
  "+": (pose) => pose.zoomBy(ZOOM_STEP),
  "=": (pose) => pose.zoomBy(ZOOM_STEP),
  "-": (pose) => pose.zoomBy(1 / ZOOM_STEP),
  "0": (pose) => pose.reset(),
};

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
  const pose = useBookPose(reduced);

  const cloneX = useMotionValue(0);
  const cloneY = useMotionValue(0);
  const cloneScale = useMotionValue(1);
  const cloneOpacity = useMotionValue(1);
  const sceneOpacity = useMotionValue(0);
  const chrome = useMotionValue(0);

  const [landed, setLanded] = useState(false);
  const [ready, setReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [slow, setSlow] = useState(false);
  const [failed, setFailed] = useState(false);
  // Aviso passageiro na área de status: um toast ficaria fora do diálogo,
  // que o Radix esconde do leitor de tela
  const [notice, setNotice] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const interactive = revealed && !closing;
  const gestures = useStageGestures(stageRef, pose, interactive);

  // Inclinar o aparelho: ligado de saída onde não há permissão a pedir
  // (Android), a não ser com movimento reduzido; no iOS, o toque pede
  const [tiltSupport] = useState(orientationSupport);
  const [tiltOn, setTiltOn] = useState(
    () => tiltSupport === "granted" && !reduced,
  );
  useDeviceTilt(tiltOn && interactive, pose.setTilt);

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
  // e, depois, o livro gira para a pose de 3/4: é quando ele vira 3D. Com
  // movimento reduzido, o livro já entra girado, só com opacidade
  const reveal = useEffectEvent(() => {
    if (reduced) pose.settle();
    animate(sceneOpacity, 1, tweens.base);
    animate(cloneOpacity, 0, tweens.base).then(() => {
      if (closingRef.current) return;
      setRevealed(true);
      if (!reduced) pose.settle();
    });
  });

  useEffect(() => {
    if (landed && ready && !closing) reveal();
  }, [landed, ready, closing]);

  // A volta: o livro fica de frente, o clone reaparece por cima dele e voa de
  // volta para a capa da página, enquanto o fundo some
  const leave = useEffectEvent(async () => {
    await pose.toFront();
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

  // A cena caiu (às vezes já revelada, com o contexto perdido): o clone 2D
  // volta para o lugar dela
  function fail() {
    setFailed(true);
    setRevealed(false);
    animate(cloneOpacity, 1, tweens.base);
  }

  function retry() {
    setFailed(false);
    setReady(false);
    setSlow(false);
    setAttempt((current) => current + 1);
  }

  async function toggleTilt() {
    if (tiltOn) {
      setTiltOn(false);
      return;
    }
    if (await requestOrientation()) {
      setTiltOn(true);
      return;
    }
    setNotice(
      "Sem acesso ao movimento do aparelho. Libere nos ajustes do navegador.",
    );
  }

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (!interactive || event.altKey || event.ctrlKey || event.metaKey) return;
    const action = KEYS[event.key];
    if (!action) return;
    event.preventDefault();
    action(pose);
  }

  const actions: PillAction[] = [
    {
      id: "girar",
      label: "Girar",
      icon: Orbit,
      pressed: pose.spinning,
      disabled: !interactive,
      onClick: () => pose.setSpinning(!pose.spinning),
    },
    {
      id: "resetar",
      label: "Resetar",
      icon: RotateCcw,
      disabled: !interactive,
      onClick: pose.reset,
    },
    ...(tiltSupport === "none"
      ? []
      : [
          {
            id: "inclinar",
            label: "Inclinar",
            icon: Smartphone,
            pressed: tiltOn,
            disabled: !interactive,
            onClick: toggleTilt,
          },
        ]),
    {
      id: "fechar",
      label: "Fechar",
      icon: XIcon,
      onClick: onRequestClose,
      shortcut: "Esc",
    },
  ];

  const authors = book.authors.join(", ");
  const message = slow && !ready ? "Montando o livro…" : notice;

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
            className="fixed inset-0 isolate z-50 bg-background"
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
          onKeyDown={onKeyDown}
          className="fixed inset-0 z-50 overflow-hidden text-foreground"
        >
          <div
            ref={stageRef}
            tabIndex={0}
            role="application"
            aria-roledescription="livro em 3D"
            aria-label={`${book.title} em 3D`}
            aria-describedby={instructionsId}
            {...gestures}
            className={cn(
              "absolute inset-0 touch-none select-none focus-visible:-outline-offset-4",
              interactive && "cursor-grab active:cursor-grabbing",
            )}
          >
            {landed ? (
              <motion.div
                className="absolute inset-0"
                style={{ opacity: sceneOpacity }}
              >
                <SceneBoundary key={attempt} onError={fail}>
                  <BookScene
                    book={book}
                    description={description}
                    dims={dims}
                    framing={framing}
                    pose={pose.values}
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
              ) : message ? (
                // Por cima do livro, o aviso ganha o fundo da pílula
                <motion.p
                  key={message}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: tweens.base }}
                  exit={{ opacity: 0, transition: tweens.fast }}
                  className="rounded-full bg-background/85 px-3 py-1.5 text-center text-sm text-pretty text-muted-foreground backdrop-blur-md"
                >
                  {message}
                </motion.p>
              ) : null}
            </AnimatePresence>
          </div>

          <motion.div style={{ opacity: chrome }}>
            <ViewerPill actions={actions} />
          </motion.div>

          <DialogPrimitive.Description id={instructionsId} className="sr-only">
            Arraste ou use as setas para girar o livro. Role, faça pinça ou use
            + e − para aproximar, e dê dois cliques para voltar ao começo.
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
