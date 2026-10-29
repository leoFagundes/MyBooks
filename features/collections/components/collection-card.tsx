"use client";

import { LockIcon } from "lucide-react";
import { motion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { useRef, useState } from "react";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { CollectionVisual } from "../types";
import { collectionCounts } from "./collection-counts";
import { CollectionCover } from "./collection-cover";
import { CollectionPeek } from "./collection-peek";

type CollectionCardProps = {
  collection: CollectionVisual;
  href: Route;
  className?: string;
};

/**
 * Card de coleção: um link de verdade para a página (Ctrl/⌘ ou o botão do
 * meio abrem em outra aba). O clique simples abre a espiada, que cresce do
 * próprio card. O leque abre no hover e no foco.
 */
export function CollectionCard({
  collection,
  href,
  className,
}: CollectionCardProps) {
  const [peek, setPeek] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const link = useRef<HTMLAnchorElement>(null);
  const layoutId = `colecao-${collection.id}`;

  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    setPeek(true);
  }

  return (
    <>
      <motion.div
        layoutId={layoutId}
        transition={springs.smooth}
        className={cn("rounded-card", className)}
      >
        <Link
          ref={link}
          href={href}
          aria-haspopup="dialog"
          onClick={onClick}
          // No toque não há "sair de cima": o leque ficaria aberto
          onPointerEnter={(event) => setHovered(event.pointerType === "mouse")}
          onPointerLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex flex-col gap-4 rounded-card border border-border bg-card p-4 transition-colors hover:border-border-strong"
        >
          <CollectionCover
            covers={collection.covers}
            emoji={collection.emoji}
            open={hovered || focused}
            data-testid={`leque-${collection.id}`}
          />
          <div className="flex min-w-0 flex-col gap-1">
            {/* O título quebra linha (até duas) em vez de virar reticências */}
            <p className="flex items-baseline gap-2 font-serif text-xl leading-tight">
              {collection.emoji ? (
                <span aria-hidden>{collection.emoji}</span>
              ) : null}
              <span className="line-clamp-2 min-w-0 text-pretty">
                {collection.title}
              </span>
              {collection.visibility === "private" ? (
                <LockIcon
                  aria-label="Privada"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
              ) : null}
            </p>
            <p className="text-sm text-muted-foreground">
              por @{collection.owner.username}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {collectionCounts(collection)}
            </p>
          </div>
        </Link>
      </motion.div>
      <CollectionPeek
        collection={collection}
        href={href}
        layoutId={layoutId}
        returnFocusRef={link}
        open={peek}
        onOpenChange={setPeek}
      />
    </>
  );
}
