"use client";

import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { createContext, use } from "react";
import { overlayVariants } from "@/lib/motion";
import {
  useCloseOnHide,
  useControllableState,
} from "@/lib/use-controllable-state";
import { cn } from "@/lib/utils";

const MenuOpenContext = createContext(false);
const SubOpenContext = createContext(false);

function DropdownMenu({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  useCloseOnHide(open, setOpen);

  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen} {...props}>
      <MenuOpenContext value={open}>{children}</MenuOpenContext>
    </DropdownMenuPrimitive.Root>
  );
}

function DropdownMenuTrigger(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>,
) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  );
}

const menuSurface =
  "z-50 min-w-48 overflow-hidden rounded-card border border-border bg-popover p-1 text-popover-foreground outline-none";

function DropdownMenuContent({
  className,
  align = "end",
  sideOffset = 8,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.Content>,
  "asChild" | "forceMount"
>) {
  const open = use(MenuOpenContext);
  const reduced = useReducedMotion() ?? false;

  return (
    <AnimatePresence>
      {open && (
        <DropdownMenuPrimitive.Portal forceMount>
          <DropdownMenuPrimitive.Content
            asChild
            forceMount
            align={align}
            sideOffset={sideOffset}
            {...props}
          >
            <motion.div
              data-slot="dropdown-menu-content"
              variants={overlayVariants(reduced)}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                transformOrigin:
                  "var(--radix-dropdown-menu-content-transform-origin)",
              }}
              className={cn(menuSurface, className)}
            >
              {children}
            </motion.div>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

// O fundo do item ativo fica perto de 1,1:1; a barra de acento à esquerda dá
// os 3:1 que quem anda pelo teclado precisa (WCAG 1.4.11)
const itemClasses =
  "relative flex cursor-default items-center gap-2 rounded-[8px] px-2.5 py-2 text-sm outline-none select-none before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-ring before:opacity-0 data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-muted data-highlighted:before:opacity-100 data-inset:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg]:text-muted-foreground";

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        itemClasses,
        "data-[variant=destructive]:text-destructive data-[variant=destructive]:[&_svg]:text-destructive",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      checked={checked}
      className={cn(itemClasses, "pr-8", className)}
      {...props}
    >
      <span className="pointer-events-none absolute right-2.5 flex items-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="text-foreground" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>,
) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(itemClasses, "pr-8", className)}
      {...props}
    >
      <span className="pointer-events-none absolute right-2.5 flex items-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="text-foreground" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2.5 py-1.5 text-xs text-muted-foreground data-inset:pl-8",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto font-mono text-xs text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuGroup(
  props: React.ComponentProps<typeof DropdownMenuPrimitive.Group>,
) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  );
}

function DropdownMenuSub({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  return (
    <DropdownMenuPrimitive.Sub open={open} onOpenChange={setOpen} {...props}>
      <SubOpenContext value={open}>{children}</SubOpenContext>
    </DropdownMenuPrimitive.Sub>
  );
}

function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(itemClasses, "data-open:bg-muted", className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>,
  "asChild" | "forceMount"
>) {
  const open = use(SubOpenContext);
  const reduced = useReducedMotion() ?? false;

  return (
    <AnimatePresence>
      {open && (
        <DropdownMenuPrimitive.Portal forceMount>
          <DropdownMenuPrimitive.SubContent
            asChild
            forceMount
            sideOffset={6}
            {...props}
          >
            <motion.div
              data-slot="dropdown-menu-sub-content"
              variants={overlayVariants(reduced)}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                transformOrigin:
                  "var(--radix-dropdown-menu-content-transform-origin)",
              }}
              className={cn(menuSurface, "min-w-40", className)}
            >
              {children}
            </motion.div>
          </DropdownMenuPrimitive.SubContent>
        </DropdownMenuPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
