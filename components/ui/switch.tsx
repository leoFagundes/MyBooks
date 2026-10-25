"use client";

import { motion } from "motion/react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { springs } from "@/lib/motion";
import { useControllableState } from "@/lib/use-controllable-state";
import { cn } from "@/lib/utils";

// Caminho do botão dentro do trilho: 36px - 2px de borda - 4px de folga - 14px
const TRAVEL = 16;

/** Liga e desliga, com o botão correndo de mola. O Radix cuida de role e teclado. */
function Switch({
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  const [checked, setChecked] = useControllableState({
    value: checkedProp,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
  });

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      checked={checked}
      onCheckedChange={setChecked}
      className={cn(
        "inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-border-strong bg-surface p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb asChild>
        <motion.span
          initial={false}
          animate={{ x: checked ? TRAVEL : 0 }}
          transition={springs.snappy}
          className="block size-3.5 rounded-full bg-border-strong data-[state=checked]:bg-primary-foreground"
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}

export { Switch };
