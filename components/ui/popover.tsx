"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { createContext, use } from "react";
import { overlayVariants } from "@/lib/motion";
import {
  useCloseOnHide,
  useControllableState,
} from "@/lib/use-controllable-state";
import { cn } from "@/lib/utils";

const PopoverOpenContext = createContext(false);

function Popover({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  useCloseOnHide(open, setOpen);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen} {...props}>
      <PopoverOpenContext value={open}>{children}</PopoverOpenContext>
    </PopoverPrimitive.Root>
  );
}

function PopoverTrigger(
  props: React.ComponentProps<typeof PopoverPrimitive.Trigger>,
) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverAnchor(
  props: React.ComponentProps<typeof PopoverPrimitive.Anchor>,
) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof PopoverPrimitive.Content>,
  "asChild" | "forceMount"
>) {
  const open = use(PopoverOpenContext);
  const reduced = useReducedMotion() ?? false;

  return (
    <AnimatePresence>
      {open && (
        <PopoverPrimitive.Portal forceMount>
          <PopoverPrimitive.Content
            asChild
            forceMount
            align={align}
            sideOffset={sideOffset}
            {...props}
          >
            <motion.div
              data-slot="popover-content"
              variants={overlayVariants(reduced)}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                transformOrigin:
                  "var(--radix-popover-content-transform-origin)",
              }}
              className={cn(
                "z-50 flex w-72 flex-col gap-3 rounded-card border border-border bg-popover p-4 text-sm text-popover-foreground outline-none",
                className,
              )}
            >
              {children}
            </motion.div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };
