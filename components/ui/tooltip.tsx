"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { createContext, use } from "react";
import { overlayVariants } from "@/lib/motion";
import { useControllableState } from "@/lib/use-controllable-state";
import { cn } from "@/lib/utils";

const TooltipOpenContext = createContext(false);

function TooltipProvider({
  delayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={delayDuration} {...props} />;
}

function Tooltip({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  return (
    <TooltipPrimitive.Root open={open} onOpenChange={setOpen} {...props}>
      <TooltipOpenContext value={open}>{children}</TooltipOpenContext>
    </TooltipPrimitive.Root>
  );
}

function TooltipTrigger(
  props: React.ComponentProps<typeof TooltipPrimitive.Trigger>,
) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof TooltipPrimitive.Content>,
  "asChild" | "forceMount"
>) {
  const open = use(TooltipOpenContext);
  const reduced = useReducedMotion() ?? false;

  return (
    <AnimatePresence>
      {open && (
        <TooltipPrimitive.Portal forceMount>
          <TooltipPrimitive.Content
            asChild
            forceMount
            sideOffset={sideOffset}
            {...props}
          >
            <motion.div
              data-slot="tooltip-content"
              variants={overlayVariants(reduced)}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                transformOrigin:
                  "var(--radix-tooltip-content-transform-origin)",
              }}
              className={cn(
                "z-50 inline-flex w-fit max-w-xs items-center gap-2 rounded-control bg-foreground px-2.5 py-1.5 text-xs text-background",
                className,
              )}
            >
              {children}
            </motion.div>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
