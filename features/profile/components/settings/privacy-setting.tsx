"use client";

import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { setPrivacy } from "../../actions";

const OPTIONS = [
  { value: "publico", label: "Todos" },
  { value: "privado", label: "Só quem eu aprovar" },
] as const;

/** Quem vê a estante: salva assim que muda, e volta atrás se não der. */
export function PrivacySetting({ isPrivate }: { isPrivate: boolean }) {
  const [saved, setSaved] = useState(isPrivate);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, startTransition] = useTransition();

  function change(value: "publico" | "privado") {
    const next = value === "privado";
    if (next === optimistic) return;
    startTransition(async () => {
      setOptimistic(next);
      const result = await setPrivacy(next);
      if (result.ok) {
        setSaved(next);
        toast(
          next ? "Seu perfil agora é privado" : "Seu perfil agora é público",
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        aria-label="Quem vê sua estante"
        options={OPTIONS}
        value={optimistic ? "privado" : "publico"}
        onValueChange={change}
        className="self-start"
      />
      <p className="text-xs text-pretty text-muted-foreground">
        {optimistic
          ? "Quem quiser ver a estante, as coleções e as citações pede para seguir, e você aprova."
          : "Qualquer pessoa vê sua estante, suas coleções e suas citações."}
      </p>
    </div>
  );
}
