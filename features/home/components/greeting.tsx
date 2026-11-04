"use client";

import { useSyncExternalStore } from "react";
import { SwapText } from "@/components/motion/swap-text";

const noSubscription = () => () => {};

function greetingAt(hour: number) {
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * "Bom dia, Ana." pela hora de quem vê: o servidor não sabe o fuso, então
 * ele manda "Oi" e o navegador troca (com o SwapText, sem salto).
 */
export function Greeting({ name }: { name: string }) {
  const hello = useSyncExternalStore(
    noSubscription,
    () => greetingAt(new Date().getHours()),
    () => "Oi",
  );
  return (
    <h1 className="font-serif text-4xl tracking-tight sm:text-5xl">
      <SwapText text={`${hello}, ${name}.`} />
    </h1>
  );
}
