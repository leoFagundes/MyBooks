"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { installApp, useInstallApp } from "../lib/install";
import { InstallGuide } from "./install-guide";

const HINT_KEY = "mybooks:aviso-instalar";
const HINT_DELAY_MS = 20_000;
// Onde o aviso atrapalharia: a apresentação, a conta e a primeira visita
const NO_HINT = ["/", "/entrar", "/cadastro", "/onboarding", "/sem-conexao"];

/**
 * O app instalável (MELHORIAS 9.1): registra o service worker (só em
 * produção; no dev ele guardaria arquivos velhos), mostra uma vez, no
 * celular, o aviso de que dá para instalar e monta o passo a passo do iPhone.
 */
export function Pwa() {
  const { mode } = useInstallApp();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }, []);

  useEffect(() => {
    if (mode !== "prompt" && mode !== "ios") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    try {
      if (window.localStorage.getItem(HINT_KEY)) return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => {
      if (NO_HINT.includes(window.location.pathname)) return;
      try {
        window.localStorage.setItem(HINT_KEY, "1");
      } catch {
        // Sem armazenamento, o aviso ainda aparece uma vez nesta visita
      }
      toast("Leve o MyBooks na tela de início", {
        description: "Instale o app e abra sua estante sem o navegador.",
        duration: 12_000,
        action: { label: "Instalar", onClick: () => void installApp() },
      });
    }, HINT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [mode]);

  return <InstallGuide />;
}
