"use client";

import {
  createContext,
  use,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";
import { flushSync } from "react-dom";
import {
  DARK_SCHEME_QUERY,
  THEME_STORAGE_KEY,
  applyTheme,
  parseThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Loja externa: a preferência mora no localStorage e o tema do sistema no
// matchMedia. O React lê os dois por useSyncExternalStore, então a primeira
// renderização usa o valor do servidor e não há erro de hidratação.
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia(DARK_SCHEME_QUERY);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) listener();
  };
  media.addEventListener("change", listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
    window.removeEventListener("storage", onStorage);
  };
}

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored !== null) return parseThemePreference(stored);
  } catch {
    // Armazenamento bloqueado: vale o que foi escolhido nesta visita.
  }
  return memoryPreference ?? "system";
}

function getSnapshot() {
  const systemDark = window.matchMedia(DARK_SCHEME_QUERY).matches;
  return `${readPreference()}:${systemDark ? "dark" : "light"}`;
}

function getServerSnapshot() {
  return "system:light";
}

function currentTheme(preference = readPreference()): ResolvedTheme {
  return resolveTheme(preference, window.matchMedia(DARK_SCHEME_QUERY).matches);
}

let memoryPreference: ThemePreference | null = null;

function setPreference(preference: ThemePreference) {
  const update = () => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      // Sem armazenamento (aba privada): o tema vale só para esta visita.
      memoryPreference = preference;
    }
    applyTheme(document.documentElement, currentTheme(preference));
    flushSync(notify);
  };

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reducedMotion || typeof document.startViewTransition !== "function") {
    update();
    return;
  }
  try {
    document.startViewTransition({ update, types: ["theme"] });
  } catch {
    // Navegadores que ainda não aceitam o objeto de opções
    document.startViewTransition(update);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [rawPreference, system] = snapshot.split(":");
  const preference = parseThemePreference(rawPreference);
  const resolved = resolveTheme(preference, system === "dark");

  // Reaplica quando o sistema muda e depois do remount do Strict Mode, que
  // limpa do <html> os atributos que o JSX não declara. Lê a loja, não o valor
  // renderizado: na hidratação ele ainda é o do servidor.
  useLayoutEffect(() => {
    applyTheme(document.documentElement, currentTheme());
  }, [snapshot]);

  return (
    <ThemeContext value={{ preference, resolved, setPreference }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme() {
  const context = use(ThemeContext);
  if (!context)
    throw new Error("useTheme precisa estar dentro de <ThemeProvider>");
  return context;
}
