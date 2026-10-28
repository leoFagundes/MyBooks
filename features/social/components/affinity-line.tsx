"use client";

import type { Route } from "next";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { formatNumber } from "@/lib/format";
import { routes } from "@/lib/routes";
import type { Affinity } from "../types";

/**
 * "Afinidade literária 72% · 8 livros em comum" (spec §5.4). Na aba Estante,
 * o link liga o filtro sem ir ao servidor (a estante inteira já está na
 * página); nas outras abas, leva até ela já filtrada.
 */
export function AffinityLine({
  affinity,
  username,
}: {
  affinity: Affinity;
  username: string;
}) {
  const segment = useSelectedLayoutSegment();
  const { score, commonBooks } = affinity;

  function showCommon(event: React.MouseEvent<HTMLAnchorElement>) {
    if (segment !== null) return;
    event.preventDefault();
    const params = new URLSearchParams(window.location.search);
    params.set("comum", "1");
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params}`,
    );
  }

  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-xs text-muted-foreground">
      <span>
        Afinidade literária{" "}
        <span className="text-foreground">
          <AnimatedNumber value={score} />%
        </span>
      </span>
      <span aria-hidden>·</span>
      {commonBooks > 0 ? (
        <Link
          href={`${routes.profile(username)}?comum=1` as Route}
          onClick={showCommon}
          className="rounded-sm text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-foreground"
        >
          {commonBooks === 1
            ? "1 livro em comum"
            : `${formatNumber(commonBooks)} livros em comum`}
        </Link>
      ) : (
        <span>Nenhum livro em comum ainda</span>
      )}
    </p>
  );
}
