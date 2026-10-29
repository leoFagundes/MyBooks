"use client";

import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useBookOrigin } from "./cover-transition";

/**
 * "Voltar" para onde a capa estava: a viagem refaz o caminho ao contrário.
 * Sem origem (a pessoa chegou por um link de fora), não aparece.
 * A volta só anima com a origem pronta no clique. O roteador reaproveita os
 * dados dela (unstable_dynamicStaleTime nas páginas de origem), mas uma
 * Server Action que revalida esvazia esse cache; em produção, o prefetch
 * completo (refeito depois dela) cobre esse caso. No dev não há prefetch.
 * A página não rola para o topo: a origem rola até a capa (useTransitionSource),
 * que fora da tela não viajaria. Se a origem ainda carrega, o esqueleto dela
 * segura a capa do topo até o conteúdo chegar (ReturningCover).
 */
export function BookBackLink({ bookId }: { bookId: string }) {
  const { origin, markReturn } = useBookOrigin(bookId);
  if (!origin) return <div aria-hidden className="mb-8 h-5" />;
  return (
    <Link
      href={origin as Route}
      prefetch
      scroll={false}
      transitionTypes={["livro-volta"]}
      onClick={(event) =>
        markReturn(
          event.currentTarget
            .closest("main")
            ?.querySelector<HTMLElement>(
              `[data-testid="capa-${CSS.escape(bookId)}"] .book-cover`,
            ) ?? null,
        )
      }
      className="mb-8 inline-flex h-5 items-center gap-1.5 rounded-control text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Voltar
    </Link>
  );
}
