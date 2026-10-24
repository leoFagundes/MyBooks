"use client";

import NumberFlow from "@number-flow/react";
import { formatNumber, NUMBER_LOCALE } from "@/lib/format";
import { durations, easing } from "@/lib/motion";
import { cn } from "@/lib/utils";

const curve = `cubic-bezier(${easing.join(", ")})`;
const spin = { duration: durations.slow * 1000, easing: curve };
const fade = { duration: durations.base * 1000, easing: curve };

/**
 * Contador que gira os dígitos até o novo valor (NumberFlow, spec §3,
 * momento 6). Os dígitos são só visuais: leitores de tela e testes leem o
 * número formatado ao lado. Com movimento reduzido, o NumberFlow só troca.
 */
export function AnimatedNumber({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)}>
      <NumberFlow
        value={value}
        locales={NUMBER_LOCALE}
        transformTiming={spin}
        spinTiming={spin}
        opacityTiming={fade}
        aria-hidden="true"
      />
      <span className="sr-only">{formatNumber(value)}</span>
    </span>
  );
}
