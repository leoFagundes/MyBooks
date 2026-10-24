"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./account-menu";
import { useCommandPalette } from "./command-palette";
import { Logo } from "./logo";
import { NavLinks, mainNavItems, type NavViewer } from "./nav-links";
import { NotificationsButton } from "./notifications-button";
import { ThemeToggle } from "./theme-toggle";

type TopNavProps = {
  viewer: NavViewer | null;
  /** Renderiza no fluxo da página (vitrine do /dev), sem ficar presa no topo. */
  preview?: boolean;
};

/**
 * Barra fina e translúcida (spec §2): logo à esquerda; Início, Explorar e
 * Minha estante no centro; ⌘K, +, notificações e avatar à direita.
 */
export function TopNav({ viewer, preview = false }: TopNavProps) {
  const indicatorId = useId();
  const palette = useCommandPalette();

  return (
    <header
      className={cn(
        "top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md",
        preview ? "relative" : "sticky",
      )}
    >
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-1 md:flex"
        >
          <NavLinks
            items={mainNavItems(viewer)}
            indicatorId={indicatorId}
            variant="top"
          />
        </nav>
        <div className="col-start-3 flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            onClick={palette.toggle}
            aria-label="Buscar"
            aria-keyshortcuts="Meta+K Control+K"
            className="h-9 gap-2 px-2.5"
          >
            <Search />
            <span className="hidden lg:inline">Buscar</span>
            <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
          </Button>
          {viewer ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Adicionar livro"
                onClick={palette.toggle}
                className="hidden md:inline-flex"
              >
                <Plus />
              </Button>
              <NotificationsButton />
              <AccountMenu viewer={viewer} />
            </>
          ) : (
            <>
              <ThemeToggle />
              <Button size="sm" asChild className="ml-1">
                <Link href={routes.entrar}>Entrar</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
