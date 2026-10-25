"use client";

import { XIcon } from "lucide-react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Emojis de leitura à mão; "Outro" aceita qualquer um. */
export const COLLECTION_EMOJIS = [
  "📚",
  "📖",
  "🌙",
  "☕",
  "🍵",
  "🌊",
  "🔥",
  "🌿",
  "🌸",
  "🍂",
  "❄️",
  "🌒",
  "🗺️",
  "🧭",
  "🕯️",
  "💔",
  "✨",
  "🐉",
  "🚀",
  "🔍",
  "🎭",
  "🏛️",
  "🌵",
  "🧵",
] as const;

const curated = new Set<string>(COLLECTION_EMOJIS);

type EmojiPickerProps = {
  value: string;
  onChange: (value: string) => void;
  /** Id do rótulo visível; sem ele, o grupo se chama "Emoji". */
  labelledBy?: string;
  invalid?: boolean;
  errorId?: string;
};

const itemClass =
  "flex size-9 cursor-pointer items-center justify-center rounded-control border border-transparent text-lg transition-colors hover:bg-muted data-[state=checked]:border-brand data-[state=checked]:bg-muted";

/**
 * Escolha do emoji da coleção: uma grade de rádios (setas andam e escolhem)
 * com "Sem emoji" e "Outro", que abre um campo para qualquer emoji.
 */
export function EmojiPicker({
  value,
  onChange,
  labelledBy,
  invalid,
  errorId,
}: EmojiPickerProps) {
  const [other, setOther] = useState(value !== "" && !curated.has(value));
  const selected = other ? "outro" : value === "" ? "nenhum" : value;

  return (
    <div className="flex flex-col gap-3">
      <RadioGroupPrimitive.Root
        {...(labelledBy
          ? { "aria-labelledby": labelledBy }
          : { "aria-label": "Emoji" })}
        value={selected}
        loop
        onValueChange={(next) => {
          if (next === "outro") {
            setOther(true);
            if (curated.has(value)) onChange("");
            return;
          }
          setOther(false);
          onChange(next === "nenhum" ? "" : next);
        }}
        className="flex flex-wrap gap-1"
      >
        <RadioGroupPrimitive.Item
          value="nenhum"
          aria-label="Sem emoji"
          className={cn(itemClass, "text-muted-foreground")}
        >
          <XIcon className="size-4" />
        </RadioGroupPrimitive.Item>
        {COLLECTION_EMOJIS.map((emoji) => (
          <RadioGroupPrimitive.Item
            key={emoji}
            value={emoji}
            className={itemClass}
          >
            {emoji}
          </RadioGroupPrimitive.Item>
        ))}
        <RadioGroupPrimitive.Item
          value="outro"
          className={cn(itemClass, "w-auto px-3 text-sm")}
        >
          Outro
        </RadioGroupPrimitive.Item>
      </RadioGroupPrimitive.Root>
      {other ? (
        <Input
          autoFocus
          aria-label="Escreva um emoji"
          placeholder="Cole ou digite um emoji"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={errorId}
          className="w-48"
        />
      ) : null}
    </div>
  );
}
