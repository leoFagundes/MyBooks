"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "motion/react";
import { Slot } from "radix-ui";
import { pressScale, springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control border border-transparent text-sm font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Invertido: preto no claro, branco no escuro (spec §2)
        primary: "bg-primary text-primary-foreground hover:bg-primary/88",
        secondary: "bg-secondary text-secondary-foreground hover:bg-border",
        outline: "border-border bg-surface text-foreground hover:bg-muted",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive: "border-border bg-surface text-destructive hover:bg-muted",
        link: "h-auto px-0 text-foreground underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        lg: "h-11 px-5 text-base",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

const MotionSlot = motion.create(Slot.Root);

type ButtonProps = HTMLMotionProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

/** Encolhe para 0.97 ao clicar, com mola (spec §3, momento 7). */
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? MotionSlot : motion.button;
  return (
    <Comp
      data-slot="button"
      whileTap={{ scale: pressScale }}
      transition={springs.snappy}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
