"use client";

import { XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/features/books/components/book-cover";
import { overlayVariants, springs, tweens } from "@/lib/motion";
import type { CollectionVisual } from "../types";
import { collectionCounts } from "./collection-counts";

type CollectionPeekProps = {
  collection: CollectionVisual;
  href: Route;
  /** O mesmo `layoutId` do card: a espiada cresce dele e volta para ele. */
  layoutId: string;
  /** Quem recebe o foco ao fechar (o link do card). */
  returnFocusRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Espiada da coleção (spec §3, momento 2): o card se expande na mesma tela,
 * com a descrição, as capas e o caminho para a página. O Radix cuida de foco,
 * Esc e aria; ao fechar, o foco volta para o card.
 */
export function CollectionPeek({
  collection,
  href,
  layoutId,
  returnFocusRef,
  open,
  onOpenChange,
}: CollectionPeekProps) {
  const reduced = useReducedMotion() ?? false;
  // Com movimento reduzido não há crescimento: a espiada só esmaece
  const panelMotion = reduced
    ? {
        variants: overlayVariants(true),
        initial: "hidden",
        animate: "visible",
        exit: "exit",
      }
    : { layoutId, transition: springs.smooth };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: tweens.base }}
                exit={{ opacity: 0, transition: tweens.fast }}
              />
            </DialogPrimitive.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
              <DialogPrimitive.Content
                asChild
                forceMount
                // Sem DialogTrigger, o Radix não sabe para onde devolver o foco
                onCloseAutoFocus={(event) => {
                  event.preventDefault();
                  returnFocusRef.current?.focus({ preventScroll: true });
                }}
                {...(collection.description
                  ? {}
                  : { "aria-describedby": undefined })}
              >
                <motion.div
                  {...panelMotion}
                  className="pointer-events-auto relative flex max-h-full w-full max-w-2xl flex-col gap-6 overflow-y-auto rounded-card border border-border bg-popover p-6 text-popover-foreground outline-none"
                >
                  <div className="flex flex-col gap-2 pr-10">
                    <DialogPrimitive.Title className="flex items-center gap-3 font-serif text-3xl leading-tight tracking-tight text-balance">
                      {collection.emoji ? (
                        <span aria-hidden>{collection.emoji}</span>
                      ) : null}
                      {collection.title}
                    </DialogPrimitive.Title>
                    {collection.description ? (
                      <DialogPrimitive.Description className="max-w-prose text-pretty text-muted-foreground">
                        {collection.description}
                      </DialogPrimitive.Description>
                    ) : null}
                    <p className="text-sm text-muted-foreground">
                      por @{collection.owner.username}
                      {collection.members.length > 0
                        ? ` com ${collection.members.map((member) => `@${member.username}`).join(", ")}`
                        : null}
                    </p>
                  </div>

                  {collection.covers.length > 0 ? (
                    <ul
                      aria-label="Algumas capas da coleção"
                      className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-1"
                    >
                      {collection.covers.map((book) => (
                        <li key={book.id} className="shrink-0">
                          <BookCover book={book} size="sm" tilt={false} />
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <p className="font-mono text-xs text-muted-foreground">
                      {collectionCounts(collection)}
                    </p>
                    <Button asChild>
                      <Link href={href}>Abrir coleção</Link>
                    </Button>
                  </div>

                  <DialogPrimitive.Close asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="absolute top-4 right-4"
                      aria-label="Fechar"
                    >
                      <XIcon />
                    </Button>
                  </DialogPrimitive.Close>
                </motion.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
