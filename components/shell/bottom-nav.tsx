"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { useAddBook } from "@/features/shelf/components/add-book/add-book-provider";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { EstanteLink } from "./estante-link";
import {
  mainNavItems,
  NavIndicatorContext,
  NavLinks,
  type NavViewer,
} from "./nav-links";

type BottomNavProps = (
  | { viewer: NavViewer | null; estante?: never }
  | { viewer?: never; estante: React.ReactNode }
) & {
  /** Renderiza no fluxo da página (vitrine do /dev). */
  preview?: boolean;
};

/**
 * No celular, uma pílula flutuante com a navegação e o botão de adicionar.
 * No app, "Minha estante" chega num slot com Suspense; na vitrine, do viewer.
 */
export function BottomNav({
  viewer,
  estante,
  preview = false,
}: BottomNavProps) {
  const indicatorId = useId();
  const router = useRouter();
  const addBook = useAddBook();
  const [inicio, explorar] = mainNavItems(null);

  return (
    <NavIndicatorContext value={indicatorId}>
      <nav
        aria-label="Navegação no celular"
        className={cn(
          "pointer-events-none flex justify-center",
          !preview &&
            "fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden",
        )}
        style={preview ? undefined : { viewTransitionName: "site-pill" }}
      >
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-background/85 p-1.5 backdrop-blur-md">
          <NavLinks
            items={[inicio, explorar]}
            indicatorId={indicatorId}
            variant="pill"
          />
          <Button
            size="icon"
            aria-label="Adicionar livro"
            // Sem conta, o + leva para entrar
            onClick={() =>
              addBook.enabled ? addBook.open() : router.push(routes.entrar)
            }
            className="mx-1 size-11 rounded-full"
          >
            <Plus className="size-5" />
          </Button>
          {estante ?? <EstanteLink viewer={viewer ?? null} variant="pill" />}
        </div>
      </nav>
    </NavIndicatorContext>
  );
}
