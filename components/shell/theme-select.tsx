"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/segmented-control";
import type { ThemePreference } from "@/lib/theme";
import { useTheme } from "./theme-provider";

const options: readonly SegmentedOption<ThemePreference>[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

/** Claro · Escuro · Sistema (usado no /dev e, depois, nas configurações). */
export function ThemeSelect({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  return (
    <SegmentedControl
      aria-label="Tema"
      value={preference}
      onValueChange={setPreference}
      options={options}
      className={className}
    />
  );
}
