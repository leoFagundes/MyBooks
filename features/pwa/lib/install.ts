import { useSyncExternalStore } from "react";

// Instalar o app (MELHORIAS 9.1). O Chrome e o Edge avisam que dá para
// instalar com o evento beforeinstallprompt, que pode chegar antes da
// hidratação: o módulo o guarda desde que carrega. O Safari não tem o evento,
// e no iPhone e no iPad o caminho é o passo a passo (Compartilhar, Adicionar
// à Tela de Início).

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** O que o botão "Instalar o app" faz aqui. */
export type InstallMode = "installed" | "prompt" | "ios" | "unavailable";

const STANDALONE = "(display-mode: standalone)";

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
let guideOpen = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Sem o aviso do próprio navegador: quem pede é o botão
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    notify();
  });
}

function isStandalone() {
  return (
    window.matchMedia(STANDALONE).matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isAppleMobile() {
  const agent = navigator.userAgent;
  // O iPad se apresenta como Mac, mas tem toque
  return (
    /iPad|iPhone|iPod/.test(agent) ||
    (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1)
  );
}

function currentMode(): InstallMode {
  if (installed || isStandalone()) return "installed";
  if (deferred) return "prompt";
  if (isAppleMobile()) return "ios";
  return "unavailable";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia(STANDALONE);
  media.addEventListener("change", listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
  };
}

/**
 * Instala: no Chrome e no Edge, o diálogo do navegador; no iPhone e no iPad,
 * abre o passo a passo.
 */
export async function installApp() {
  if (deferred) {
    const event = deferred;
    deferred = null;
    await event.prompt();
    const { outcome } = await event.userChoice;
    notify();
    return outcome;
  }
  if (isAppleMobile()) {
    guideOpen = true;
    notify();
    return "guide" as const;
  }
  return "dismissed" as const;
}

export function closeInstallGuide() {
  guideOpen = false;
  notify();
}

/** O modo de instalar daqui e se o passo a passo do iPhone está aberto. */
export function useInstallApp() {
  const mode = useSyncExternalStore(
    subscribe,
    currentMode,
    (): InstallMode => "unavailable",
  );
  const guide = useSyncExternalStore(
    subscribe,
    () => guideOpen,
    () => false,
  );
  return { mode, guideOpen: guide };
}
