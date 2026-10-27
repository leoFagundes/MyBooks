"use client";

import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useBookOrigin } from "./cover-transition";

/**
 * "Voltar" para onde a capa estava: a viagem refaz o caminho ao contrário.
 * Sem origem (a pessoa chegou por um link de fora), não aparece.
 */
export function BookBackLink({ bookId }: { bookId: string }) {
  const origin = useBookOrigin(bookId);
  if (!origin) return <div aria-hidden className="mb-8 h-5" />;
  return (
    <Link
      href={origin as Route}
      className="mb-8 inline-flex h-5 items-center gap-1.5 rounded-control text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      Voltar
    </Link>
  );
}
