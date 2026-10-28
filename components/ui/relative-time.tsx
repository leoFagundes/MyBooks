"use client";

import { useSyncExternalStore } from "react";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

// Um relógio só, que anda de minuto em minuto, para todos os tempos da tela.
// A hora só é lida no navegador: o servidor não sabe a de quem vê
let now: number | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= setInterval(() => {
    now = Date.now();
    for (const notify of listeners) notify();
  }, 60_000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => (now ??= Date.now());
const getServerSnapshot = () => null;

/** "há 5 min": o servidor manda vazio, e o navegador preenche. */
export function RelativeTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const current = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return (
    <time
      dateTime={iso}
      className={cn("font-mono text-[11px] text-muted-foreground", className)}
    >
      {current === null ? "" : formatRelativeTime(iso, current)}
    </time>
  );
}
