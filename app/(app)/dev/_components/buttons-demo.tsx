"use client";

import { BookmarkPlus, Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DemoRow } from "./dev-section";

export function ButtonsDemo() {
  return (
    <>
      <DemoRow label="Variantes">
        <Button>Criar minha estante</Button>
        <Button variant="secondary">Nova coleção</Button>
        <Button variant="outline">Ver estante</Button>
        <Button variant="ghost">Cancelar</Button>
        <Button variant="destructive">Remover</Button>
        <Button variant="link">Ler mais</Button>
      </DemoRow>
      <DemoRow label="Tamanhos e ícones">
        <Button size="sm">
          <Plus />
          Adicionar
        </Button>
        <Button>
          <BookmarkPlus />
          Quero ler
        </Button>
        <Button size="lg">Começar</Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Copiar para minha estante"
            >
              <BookmarkPlus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copiar para minha estante</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Curtir coleção">
              <Heart />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Curtir coleção</TooltipContent>
        </Tooltip>
        <Button disabled>Salvando…</Button>
      </DemoRow>
    </>
  );
}
