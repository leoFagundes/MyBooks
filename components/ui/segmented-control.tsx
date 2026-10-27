"use client";

import { motion } from "motion/react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useId } from "react";
import { formatNumber } from "@/lib/format";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Número ao lado do rótulo, em mono (quantos livros em cada status). */
  count?: number;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  "aria-label": string;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Escolha única com o fundo deslizando por layoutId (spec §3, momento 2).
 * É um radiogroup: setas andam e selecionam, como rádios nativos.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  const id = useId();

  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      orientation="horizontal"
      loop
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-control border border-border bg-muted p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <RadioGroupPrimitive.Item
            key={option.value}
            value={option.value}
            // Contorno de foco por dentro: o grupo rola na horizontal e
            // cortaria um contorno por fora
            className={cn(
              "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md px-3 text-sm whitespace-nowrap transition-colors focus-visible:-outline-offset-2",
              size === "sm" ? "h-7" : "h-8",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`${id}-segmento`}
                transition={springs.snappy}
                className="absolute inset-0 rounded-md border border-border bg-surface"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {Icon ? <Icon className="size-4" /> : null}
              {option.label}
              {option.count !== undefined ? (
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {formatNumber(option.count)}
                </span>
              ) : null}
            </span>
          </RadioGroupPrimitive.Item>
        );
      })}
    </RadioGroupPrimitive.Root>
  );
}
