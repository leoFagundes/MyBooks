"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { springs } from "@/lib/motion";
import { CoverTransitionProvider } from "@/features/books/components/cover-transition";
import { NewCollectionProvider } from "@/features/collections/components/new-collection-provider";
import { AddBookProvider } from "@/features/shelf/components/add-book/add-book-provider";
import { NextReadProvider } from "@/features/shelf/components/next-read/next-read-provider";
import { CommandPaletteProvider } from "./command-palette";
import { QueryProvider } from "./query-provider";
import { ShelfFlightProvider } from "./shelf-flight";
import { SmoothScroll } from "./smooth-scroll";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        {/* Movimento reduzido desliga transform e layout; o resto vira opacidade */}
        <MotionConfig reducedMotion="user" transition={springs.smooth}>
          <TooltipProvider>
            <CoverTransitionProvider>
              <ShelfFlightProvider>
                <AddBookProvider>
                  <NextReadProvider>
                    <NewCollectionProvider>
                      <CommandPaletteProvider>
                        <SmoothScroll />
                        {children}
                        <Toaster />
                      </CommandPaletteProvider>
                    </NewCollectionProvider>
                  </NextReadProvider>
                </AddBookProvider>
              </ShelfFlightProvider>
            </CoverTransitionProvider>
          </TooltipProvider>
        </MotionConfig>
      </QueryProvider>
    </ThemeProvider>
  );
}
