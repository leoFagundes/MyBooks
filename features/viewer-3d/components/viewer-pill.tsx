"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

export type PillAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  /** Botão de liga e desliga (Girar, Abrir, Inclinar). */
  pressed?: boolean;
  disabled?: boolean;
  /** Tecla mostrada ao lado do rótulo, no desktop. */
  shortcut?: string;
};

/**
 * A pílula flutuante do visualizador (spec §5.7), no estilo da barra
 * inferior do celular. Do sm para cima, ícone e rótulo; abaixo, só o ícone,
 * com 44px de alvo.
 */
export function ViewerPill({ actions }: { actions: PillAction[] }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        role="group"
        aria-label="Controles do livro"
        className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-background/85 p-1.5 backdrop-blur-md"
      >
        {actions.map(
          ({ id, label, icon: Icon, onClick, pressed, disabled, shortcut }) => (
            <Button
              key={id}
              variant="ghost"
              aria-label={label}
              aria-pressed={pressed}
              disabled={disabled}
              onClick={onClick}
              className="h-11 min-w-11 rounded-full px-3 aria-pressed:bg-muted aria-pressed:text-foreground sm:px-4"
            >
              <Icon className="size-5" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
              {shortcut ? (
                <Kbd className="hidden sm:inline-flex">{shortcut}</Kbd>
              ) : null}
            </Button>
          ),
        )}
      </div>
    </div>
  );
}
