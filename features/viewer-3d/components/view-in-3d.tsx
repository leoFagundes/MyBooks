"use client";

import { Rotate3d } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BookVisual } from "@/features/books/types";
import { useCloseOnHide } from "@/lib/use-controllable-state";
import { cn } from "@/lib/utils";
import { BookViewer, preloadBookScene } from "./book-viewer";

type ViewerState = "closed" | "open" | "closing";

// Marca da entrada que o visualizador põe no histórico. Quem decide se ela
// existe é a ref `pushed`: o Next regrava o history.state quando o roteador
// muda, e a marca pode sumir
const HISTORY_MARK = "mybooks:3d";

/**
 * A capa do topo da página do livro e o botão "Ver em 3D" (spec §5.6). Tocar
 * na capa também abre; o botão é o caminho do teclado e do leitor de tela.
 * Abrir empilha uma entrada no histórico, na mesma URL: o voltar do
 * navegador (e o gesto do Android) fecha o visualizador.
 */
export function ViewIn3D({
  book,
  description,
  pending = false,
  children,
}: {
  book: BookVisual;
  description: string | null;
  /** No esqueleto: o botão aparece, desabilitado, no mesmo lugar. */
  pending?: boolean;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion() ?? false;
  const [state, setState] = useState<ViewerState>("closed");
  const pushed = useRef(false);
  const coverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function open() {
    if (pending || state !== "closed") return;
    preloadBookScene();
    window.history.pushState(
      { ...window.history.state, [HISTORY_MARK]: true },
      "",
    );
    pushed.current = true;
    setState("open");
  }

  function requestClose() {
    if (state !== "open") return;
    setState("closing");
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    }
  }

  useEffect(() => {
    if (state !== "open") return;
    function onPopState() {
      pushed.current = false;
      setState("closing");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [state]);

  // Rota escondida pelo Activity com o visualizador aberto: fecha sem animar
  useCloseOnHide(state !== "closed", (next) => {
    if (next) return;
    pushed.current = false;
    setState("closed");
  });

  const viewing = state !== "closed";

  return (
    <div className="mx-auto flex w-fit flex-col items-center gap-4 sm:mx-0">
      <div
        ref={coverRef}
        // Enquadrada pelo clone, a capa da página sai de cena; com movimento
        // reduzido não há voo, e ela fica onde está
        data-viewing={viewing && !reduced ? "" : undefined}
        onClick={open}
        onPointerEnter={pending ? undefined : preloadBookScene}
        className={cn("data-viewing:opacity-0", !pending && "cursor-pointer")}
      >
        {children}
      </div>
      <Button
        ref={buttonRef}
        variant="outline"
        size="sm"
        disabled={pending}
        aria-haspopup="dialog"
        onClick={open}
        onPointerEnter={preloadBookScene}
        onFocus={preloadBookScene}
      >
        <Rotate3d aria-hidden />
        Ver em 3D
      </Button>
      {viewing ? (
        <BookViewer
          book={book}
          description={description}
          sourceRef={coverRef}
          returnFocusRef={buttonRef}
          closing={state === "closing"}
          onRequestClose={requestClose}
          onClosed={() => setState("closed")}
        />
      ) : null}
    </div>
  );
}
