"use client";

import { Share, SquarePlus } from "lucide-react";
import {
  AddToHomeStepIllustration,
  HomeScreenStepIllustration,
  ShareStepIllustration,
} from "@/components/ui/illustrations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { closeInstallGuide, useInstallApp } from "../lib/install";

const STEPS = [
  {
    illustration: ShareStepIllustration,
    text: (
      <>
        Toque em{" "}
        <Share
          className="inline size-4 align-[-2px]"
          strokeWidth={1.5}
          aria-hidden
        />{" "}
        <strong className="font-medium">Compartilhar</strong>, na barra do
        Safari.
      </>
    ),
  },
  {
    illustration: AddToHomeStepIllustration,
    text: (
      <>
        Role e escolha{" "}
        <SquarePlus
          className="inline size-4 align-[-2px]"
          strokeWidth={1.5}
          aria-hidden
        />{" "}
        <strong className="font-medium">Adicionar à Tela de Início</strong>.
      </>
    ),
  },
  {
    illustration: HomeScreenStepIllustration,
    text: (
      <>
        Toque em <strong className="font-medium">Adicionar</strong>. O MyBooks
        aparece entre os seus apps.
      </>
    ),
  },
];

/**
 * O passo a passo do iPhone e do iPad, onde o Safari não tem o diálogo de
 * instalar: Compartilhar, Adicionar à Tela de Início e Adicionar.
 */
export function InstallGuide() {
  const { guideOpen } = useInstallApp();
  return (
    <Dialog
      open={guideOpen}
      onOpenChange={(open) => {
        if (!open) closeInstallGuide();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Instalar o MyBooks</DialogTitle>
          <DialogDescription>
            Três toques e ele abre direto da tela de início, sem o navegador.
          </DialogDescription>
        </DialogHeader>
        <ol className="flex flex-col gap-4">
          {STEPS.map((step, index) => (
            <li key={index} className="flex items-center gap-4">
              <step.illustration className="h-16 w-24 shrink-0 text-muted-foreground" />
              <p className="flex-1 text-sm text-pretty">
                <span className="mr-1 font-mono text-xs text-muted-foreground">
                  {index + 1}.
                </span>
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
