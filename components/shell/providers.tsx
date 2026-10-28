"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { springs } from "@/lib/motion";
import { CoverTransitionProvider } from "@/features/books/components/cover-transition";
import { NewCollectionProvider } from "@/features/collections/components/new-collection-provider";
import { AddBookProvider } from "@/features/shelf/components/add-book/add-book-provider";
import { CommandPaletteProvider } from "./command-palette";
import { QueryProvider } from "./query-provider";
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
              <AddBookProvider>
                <NewCollectionProvider>
                  <CommandPaletteProvider>
                    <SmoothScroll />
                    {children}
                    <Toaster />
                  </CommandPaletteProvider>
                </NewCollectionProvider>
              </AddBookProvider>
            </CoverTransitionProvider>
          </TooltipProvider>
        </MotionConfig>
      </QueryProvider>
    </ThemeProvider>
  );
}
