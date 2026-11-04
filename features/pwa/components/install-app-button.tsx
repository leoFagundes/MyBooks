"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { installApp, useInstallApp } from "../lib/install";

/**
 * "Instalar o app" em Configurações: no Chrome e no Edge, o diálogo do
 * navegador; no iPhone e no iPad, o passo a passo. Com o app já instalado,
 * o botão some.
 */
export function InstallAppButton() {
  const { mode } = useInstallApp();

  if (mode === "installed") {
    return (
      <p className="text-sm text-muted-foreground">
        O MyBooks já está instalado neste aparelho.
      </p>
    );
  }
  if (mode === "unavailable") {
    return (
      <p className="text-sm text-pretty text-muted-foreground">
        Este navegador não oferece a instalação por aqui. No Chrome e no Edge,
        procure “Instalar o app” no menu; no iPhone e no iPad, use o Safari.
      </p>
    );
  }
  return (
    <Button className="self-start" onClick={() => void installApp()}>
      <Download className="size-4" strokeWidth={1.5} aria-hidden />
      Instalar o app
    </Button>
  );
}
