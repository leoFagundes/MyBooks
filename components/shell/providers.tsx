"use client";

import { MotionConfig } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { springs } from "@/lib/motion";
import { CommandPaletteProvider } from "./command-palette";
import { SmoothScroll } from "./smooth-scroll";
import { ThemeProvider } from "./theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {/* Movimento reduzido desliga transform e layout; o resto vira opacidade */}
      <MotionConfig reducedMotion="user" transition={springs.smooth}>
        <TooltipProvider>
          <CommandPaletteProvider>
            <SmoothScroll />
            {children}
            <Toaster />
          </CommandPaletteProvider>
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
