"use client";

import { Command } from "cmdk";
import { CornerDownLeft, House, Search, Shapes, SunMoon } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { routes } from "@/lib/routes";
import { useTheme } from "./theme-provider";

type PaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const PaletteContext = createContext<PaletteContextValue | null>(null);

/** Paleta global: ⌘K / Ctrl+K em qualquer página (spec §5.11). */
export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <PaletteContext
      value={{ open, setOpen, toggle: () => setOpen((current) => !current) }}
    >
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </PaletteContext>
  );
}

export function useCommandPalette() {
  const context = use(PaletteContext);
  if (!context)
    throw new Error("useCommandPalette precisa do <CommandPaletteProvider>");
  return context;
}

// Mesmo sinal dos menus: fundo sutil mais a barra de acento, que tem 3:1
const itemClasses =
  "relative flex cursor-pointer items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm text-foreground select-none before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-ring before:opacity-0 data-[selected=true]:bg-muted data-[selected=true]:before:opacity-100 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

const groupClasses =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase";

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { resolved, setPreference } = useTheme();
  const returnFocus = useRef<HTMLElement | null>(null);

  function run(action: () => void) {
    onOpenChange(false);
    action();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="top-[14vh] max-w-lg translate-y-0 gap-0 overflow-hidden p-0"
        // Sem DialogTrigger, o Radix não sabe a quem devolver o foco: guarda
        // quem estava focado ao abrir (o botão Buscar ou onde o ⌘K foi apertado)
        onOpenAutoFocus={() => {
          const active = document.activeElement;
          returnFocus.current = active instanceof HTMLElement ? active : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Paleta de comandos</DialogTitle>
        <Command label="Paleta de comandos" loop>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <Command.Input
              placeholder="Buscar livros, pessoas e coleções…"
              className="h-13 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Kbd>Esc</Kbd>
          </div>
          <Command.List className="max-h-80 overflow-y-auto overscroll-contain p-2">
            <Command.Empty className="px-3 py-10 text-center text-sm text-pretty text-muted-foreground">
              Nada por aqui ainda. A busca de livros, leitores e coleções chega
              em breve.
            </Command.Empty>
            <Command.Group heading="Ações" className={groupClasses}>
              <Command.Item
                className={itemClasses}
                onSelect={() =>
                  run(() =>
                    setPreference(resolved === "dark" ? "light" : "dark"),
                  )
                }
              >
                <SunMoon />
                Alternar tema
              </Command.Item>
            </Command.Group>
            <Command.Group heading="Ir para" className={groupClasses}>
              <Command.Item
                className={itemClasses}
                onSelect={() => run(() => router.push(routes.home))}
              >
                <House />
                Página inicial
              </Command.Item>
              <Command.Item
                className={itemClasses}
                onSelect={() => run(() => router.push(routes.dev))}
              >
                <Shapes />
                Componentes
              </Command.Item>
            </Command.Group>
          </Command.List>
          <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              navegar
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>
                <CornerDownLeft className="size-3" aria-hidden />
              </Kbd>
              escolher
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
              abre e fecha
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
