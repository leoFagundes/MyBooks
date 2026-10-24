"use client";

import { XIcon } from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { createContext, use, useRef } from "react";
import { sheetVariants, springs, tweens, type SheetSide } from "@/lib/motion";
import {
  useCloseOnHide,
  useControllableState,
} from "@/lib/use-controllable-state";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { shouldDismissSheet } from "./sheet-gesture";

// Gaveta própria (no lugar do vaul, sem manutenção): Radix Dialog para foco,
// Esc e aria; Motion para deslizar e para arrastar a de baixo até fechar.
const SheetContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({
  open: false,
  setOpen: () => {},
});

function Sheet({
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
      <SheetContext value={{ open, setOpen }}>{children}</SheetContext>
    </DialogPrimitive.Root>
  );
}

function SheetTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>,
) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />;
}

type SheetContentProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Content>,
  "asChild" | "forceMount"
> & { side?: SheetSide };

const sideClasses: Record<SheetSide, string> = {
  bottom:
    "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-card border-t pb-[max(1.5rem,env(safe-area-inset-bottom))]",
  right: "inset-y-0 right-0 h-full w-full max-w-md border-l",
};

function SheetContent({
  side = "bottom",
  className,
  children,
  ...props
}: SheetContentProps) {
  const { open, setOpen } = use(SheetContext);
  const reduced = useReducedMotion() ?? false;
  const panel = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  // O mesmo `y` serve à variante de entrada e ao arrasto da gaveta de baixo.
  const y = useMotionValue(0);
  const draggable = side === "bottom";

  function onDragEnd(_: PointerEvent, info: PanInfo) {
    const size = panel.current?.offsetHeight ?? window.innerHeight;
    if (
      shouldDismissSheet({
        offset: info.offset.y,
        velocity: info.velocity.y,
        size,
      })
    ) {
      setOpen(false);
    } else {
      animate(y, 0, springs.smooth);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <DialogPrimitive.Portal forceMount>
          <DialogPrimitive.Overlay asChild forceMount>
            <motion.div
              className="fixed inset-0 z-50 bg-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: tweens.base }}
              exit={{ opacity: 0, transition: tweens.base }}
            />
          </DialogPrimitive.Overlay>
          <DialogPrimitive.Content asChild forceMount {...props}>
            <motion.div
              ref={panel}
              data-slot="sheet-content"
              data-side={side}
              variants={sheetVariants(side, reduced)}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={draggable ? { y } : undefined}
              drag={draggable ? "y" : false}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0 }}
              dragElastic={0}
              dragMomentum={false}
              onDragEnd={onDragEnd}
              className={cn(
                "fixed z-50 flex flex-col gap-4 border-border bg-popover p-6 text-sm text-popover-foreground outline-none",
                sideClasses[side],
                className,
              )}
            >
              {draggable ? (
                // Só a alça inicia o arrasto, para não brigar com rolagem e cliques
                <div
                  aria-hidden
                  onPointerDown={(event) => dragControls.start(event)}
                  className="-mt-3 mb-1 flex h-6 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
                >
                  <span className="h-1 w-10 rounded-full bg-border-strong/50" />
                </div>
              ) : null}
              {children}
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
            </motion.div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 pr-8", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-serif text-2xl leading-tight tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-pretty text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
