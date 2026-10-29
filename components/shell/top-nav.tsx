"use client";

import { Search } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import { AccountActions } from "./account-actions";
import { useCommandPalette } from "./command-palette";
import { EstanteLink } from "./estante-link";
import { Logo } from "./logo";
import {
  mainNavItems,
  NavIndicatorContext,
  NavLinks,
  type NavViewer,
} from "./nav-links";

/** O que depende da conta, já embrulhado em Suspense pelo layout. */
export type TopNavSlots = {
  estante: React.ReactNode;
  account: React.ReactNode;
};

type TopNavProps = (
  | { viewer: NavViewer | null; slots?: never }
  | { viewer?: never; slots: TopNavSlots }
) & {
  /** Renderiza no fluxo da página (vitrine do /dev), sem ficar presa no topo. */
  preview?: boolean;
};

/**
 * Barra fina e translúcida (spec §2): logo à esquerda; Início, Explorar e
 * Minha estante no centro; ⌘K, +, notificações e avatar à direita. No app,
 * a barra é estática e só os slots da conta chegam depois; na vitrine, tudo
 * vem do `viewer`.
 */
export function TopNav({ viewer, slots, preview = false }: TopNavProps) {
  const indicatorId = useId();
  const palette = useCommandPalette();
  const [inicio, explorar] = mainNavItems(null);

  return (
    <NavIndicatorContext value={indicatorId}>
      <header
        className={cn(
          "top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md",
          preview ? "relative" : "sticky",
        )}
        // Fica parada nas navegações; as prévias do /dev não levam o nome,
        // porque nome repetido cancela a transição inteira
        style={preview ? undefined : { viewTransitionName: "site-header" }}
      >
        <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
          <Logo />
          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-1 md:flex"
          >
            <NavLinks
              items={[inicio, explorar]}
              indicatorId={indicatorId}
              variant="top"
            />
            {slots ? (
              slots.estante
            ) : (
              <EstanteLink viewer={viewer} variant="top" target={!preview} />
            )}
          </nav>
          <div className="col-start-3 flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              onClick={palette.toggle}
              aria-keyshortcuts="Meta+K Control+K"
              className="h-9 gap-2 px-2.5"
            >
              <Search />
              {/* O nome vem do conteúdo (WCAG 2.5.3): abaixo do lg, só para
                  leitor de tela; o atalho vai no aria-keyshortcuts */}
              <span className="sr-only lg:not-sr-only">Buscar</span>
              <Kbd aria-hidden className="hidden sm:inline-flex">
                ⌘K
              </Kbd>
            </Button>
            {slots ? slots.account : <AccountActions viewer={viewer} />}
          </div>
        </div>
      </header>
    </NavIndicatorContext>
  );
}
