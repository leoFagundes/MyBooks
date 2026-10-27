"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { SwapText } from "@/components/motion/swap-text";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveReview } from "../actions";

const STATE_LABEL = {
  idle: "",
  saving: "Salvando…",
  saved: "Salvo",
  error: "Não salvou. Tento de novo quando você escrever.",
} as const;

/**
 * Resenha que salva sozinha 800ms depois da última tecla. Ao sair da página
 * (ou quando o Activity esconde a rota) e ao trocar de aba, salva na hora o
 * que faltava.
 */
export function ReviewEditor({
  bookId,
  initial,
}: {
  bookId: string;
  initial: string | null;
}) {
  const id = useId();
  const [text, setText] = useState(initial ?? "");
  const [state, setState] = useState<keyof typeof STATE_LABEL>("idle");
  // O texto que ainda não foi para o servidor
  const pending = useRef<string | null>(null);

  async function flush() {
    const value = pending.current;
    if (value === null) return;
    pending.current = null;
    setState("saving");
    const result = await saveReview(bookId, value);
    setState(result.ok ? "saved" : "error");
  }

  const flushNow = useEffectEvent(() => {
    void flush();
  });

  useEffect(() => {
    if (pending.current === null) return;
    const timer = setTimeout(flushNow, 800);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") flushNow();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      flushNow();
    };
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={`${id}-resenha`}>Resenha</Label>
        <p
          aria-live="polite"
          className="font-mono text-xs text-muted-foreground"
        >
          <SwapText text={STATE_LABEL[state]} />
        </p>
      </div>
      <Textarea
        id={`${id}-resenha`}
        value={text}
        maxLength={10_000}
        placeholder="O que ficou com você?"
        onChange={(event) => {
          setText(event.target.value);
          pending.current = event.target.value;
          if (state !== "saving") setState("idle");
        }}
        onBlur={() => void flush()}
        className="min-h-32"
      />
    </div>
  );
}
