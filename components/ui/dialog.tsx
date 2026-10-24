"use client";

import { XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { createContext, use } from "react";
import { overlayVariants, tweens } from "@/lib/motion";
import {
  useCloseOnHide,
  useControllableState,
} from "@/lib/use-controllable-state";
import { cn } from "@/lib/utils";
import { Button } from "./button";

// O Radix cuida de foco, Esc e aria; o Motion cuida da entrada e da saída.
// Para animar a saída, o conteúdo fica montado (forceMount) enquanto o
// AnimatePresence decide quando ele some.
const DialogOpenContext = createContext(false);

function Dialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  useCloseOnHide(open, setOpen);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen} {...props}>
      <DialogOpenContext value={open}>{children}</DialogOpenContext>
    </DialogPrimitive.Root>
  );
}

function DialogTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>,
) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(
  props: React.ComponentProps<typeof DialogPrimitive.Close>,
) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className }: { className?: string }) {
  return (
    <DialogPrimitive.Overlay asChild forceMount>
      <motion.div
        data-slot="dialog-overlay"
        className={cn(
          "fixed inset-0 z-50 bg-overlay backdrop-blur-[2px]",
          className,
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: tweens.base }}
        exit={{ opacity: 0, transition: tweens.fast }}
      />
    </DialogPrimitive.Overlay>
  );
}

type DialogContentProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Content>,
  "asChild" | "forceMount"
> & { showCloseButton?: boolean };

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogContentProps) {
  const open = use(DialogOpenContext);
  const reduced = useReducedMotion() ?? false;

  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Portal forceMount>
          <DialogOverlay />
          <DialogPrimitive.Content asChild forceMount {...props}>
            <motion.div
              data-slot="dialog-content"
              variants={overlayVariants(reduced)}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 rounded-card border border-border bg-popover p-6 text-sm text-popover-foreground outline-none",
                className,
              )}
            >
              {children}
              {showCloseButton && (
                <DialogPrimitive.Close asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-3 right-3"
                    aria-label="Fechar"
                  >
                    <XIcon />
                  </Button>
                </DialogPrimitive.Close>
              )}
            </motion.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pr-8", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-serif text-2xl leading-tight tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm leading-relaxed text-pretty text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogOpenContext,
  DialogTitle,
  DialogTrigger,
};
