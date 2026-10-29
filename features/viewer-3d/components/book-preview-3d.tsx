"use client";

import { Box } from "lucide-react";
import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { BookVisual } from "@/features/books/types";
import { cn } from "@/lib/utils";
import { SceneBoundary } from "./scene-boundary";

// three, R3F e drei só chegam quando a pessoa pede o 3D na prévia
const PreviewScene = dynamic(() => import("../scene/preview-scene"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-card" />,
});

/**
 * O livro em 3D na prévia do cadastro e da edição, com a cor e o estilo
 * escolhidos. Gira devagar; com movimento reduzido, fica parado em 3/4. Sem
 * WebGL, avisa em vez de quebrar o formulário.
 */
export function BookPreview3D({
  book,
  className,
}: {
  book: BookVisual;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const [failed, setFailed] = useState(false);

  return (
    <div
      role="img"
      aria-label={`${book.title} em 3D`}
      className={cn("relative", className)}
    >
      {failed ? (
        <div className="flex size-full flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border p-4 text-center">
          <Box aria-hidden className="size-5 text-muted-foreground" />
          <p className="text-xs text-pretty text-muted-foreground">
            O 3D não abriu neste aparelho. A capa e a lombada mostram como fica.
          </p>
        </div>
      ) : (
        <SceneBoundary onError={() => setFailed(true)}>
          <PreviewScene book={book} still={reduced} />
        </SceneBoundary>
      )}
    </div>
  );
}
