"use client";

import { CameraOff } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { easing } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { startBarcodeReader } from "../../lib/barcode-reader";

// Por quanto tempo o aviso de "não é de livro" fica depois do último código
const OTHER_CODE_MS = 2500;

// A linha da mira vai e volta devagar, como o brilho dos esqueletos
const sweep = {
  duration: 1.6,
  ease: easing,
  repeat: Infinity,
  repeatType: "mirror",
} as const;

type CameraState = "starting" | "scanning" | { error: string };

function cameraError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Sem acesso à câmera. Libere nos ajustes do navegador, ou digite o ISBN.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "Não achamos uma câmera neste aparelho. Digite o ISBN na busca.";
  }
  if (name === "NotReadableError") {
    return "A câmera está ocupada com outro app. Feche-o e tente de novo, ou digite o ISBN.";
  }
  return "A câmera não abriu agora. Tente de novo, ou digite o ISBN.";
}

// Os cantos da moldura invertem o que está atrás: aparecem em qualquer capa
const corners = [
  "top-0 left-0 rounded-tl-control border-t-2 border-l-2",
  "top-0 right-0 rounded-tr-control border-t-2 border-r-2",
  "bottom-0 left-0 rounded-bl-control border-b-2 border-l-2",
  "right-0 bottom-0 rounded-br-control border-r-2 border-b-2",
];

function Viewfinder() {
  const reduced = useReducedMotion();
  return (
    <div aria-hidden className="absolute inset-x-[12%] inset-y-[26%]">
      {corners.map((corner) => (
        <span
          key={corner}
          className={cn(
            "absolute size-6 border-paper mix-blend-difference",
            corner,
          )}
        />
      ))}
      {reduced ? (
        <motion.span
          className="absolute inset-x-3 top-1/2 h-0.5 rounded-full bg-brand"
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={sweep}
        />
      ) : (
        <motion.span
          className="absolute inset-x-3 inset-y-0"
          initial={{ y: "-50%" }}
          animate={{ y: "50%" }}
          transition={sweep}
        >
          <span className="absolute inset-x-0 top-1/2 h-0.5 rounded-full bg-brand" />
        </motion.span>
      )}
    </div>
  );
}

/** A câmera de uma tentativa: liga ao montar e desliga ao desmontar. */
function Camera({
  onIsbn,
  onRetry,
}: {
  onIsbn: (isbn: string) => void;
  onRetry: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>("starting");
  const [otherCode, setOtherCode] = useState(false);
  const otherTimer = useRef(0);

  const found = useEffectEvent((isbn: string) => {
    // Vibra de leve onde dá (o Safari do iOS não vibra)
    if ("vibrate" in navigator) navigator.vibrate(30);
    onIsbn(isbn);
  });
  const notABook = useEffectEvent(() => {
    setOtherCode(true);
    window.clearTimeout(otherTimer.current);
    otherTimer.current = window.setTimeout(
      () => setOtherCode(false),
      OTHER_CODE_MS,
    );
  });

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const cancel = new AbortController();
    let stop: (() => void) | null = null;
    startBarcodeReader(
      element,
      { onIsbn: (isbn) => found(isbn), onOtherCode: () => notABook() },
      cancel.signal,
    ).then(
      (stopReader) => {
        // Fechou antes da câmera ligar: ela desliga na hora
        if (cancel.signal.aborted) stopReader();
        else {
          stop = stopReader;
          setState("scanning");
        }
      },
      (error: unknown) => {
        if (!cancel.signal.aborted) setState({ error: cameraError(error) });
      },
    );
    return () => {
      cancel.abort();
      stop?.();
      window.clearTimeout(otherTimer.current);
    };
  }, []);

  const error = typeof state === "object" ? state.error : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-ink">
        <video
          ref={video}
          muted
          playsInline
          aria-hidden
          className="size-full object-cover"
        />
        {state === "starting" ? (
          <Skeleton className="absolute inset-0 rounded-none bg-ink before:via-paper/10" />
        ) : null}
        {state === "scanning" ? <Viewfinder /> : null}
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted p-6 text-center">
            <CameraOff
              className="size-8 text-muted-foreground"
              strokeWidth={1.5}
              aria-hidden
            />
            <p role="alert" className="max-w-xs text-sm text-pretty">
              {error}
            </p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Tentar de novo
            </Button>
          </div>
        ) : null}
      </div>
      <p
        role="status"
        className="min-h-4 text-center font-mono text-xs text-muted-foreground"
      >
        {error
          ? null
          : state === "starting"
            ? "Ligando a câmera…"
            : otherCode
              ? "Esse código não é de livro. Procure o que começa com 978 ou 979."
              : "Vale o código que começa com 978 ou 979."}
      </p>
    </div>
  );
}

/**
 * O passo da câmera na paleta (spec §5.5): lê o código de barras atrás do
 * livro e devolve o ISBN para a busca. Sair do passo desliga a câmera.
 */
export function ScanStep({
  onIsbn,
  onCancel,
}: {
  onIsbn: (isbn: string) => void;
  onCancel: () => void;
}) {
  // Cada tentativa é uma câmera nova
  const [attempt, setAttempt] = useState(0);

  return (
    <div className="flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-2xl leading-tight tracking-tight">
          Escanear o código de barras
        </h2>
        <p className="text-sm text-pretty text-muted-foreground">
          Aponte para o código de barras atrás do livro.
        </p>
      </div>
      <Camera
        key={attempt}
        onIsbn={onIsbn}
        onRetry={() => setAttempt((current) => current + 1)}
      />
      <Button
        variant="ghost"
        className="self-start"
        onClick={onCancel}
        autoFocus
      >
        Voltar à busca
      </Button>
    </div>
  );
}
