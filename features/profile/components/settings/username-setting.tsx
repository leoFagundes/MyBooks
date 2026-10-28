"use client";

import { Check } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { SwapText } from "@/components/motion/swap-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeUsername } from "../../actions";
import {
  AVAILABILITY_MESSAGES,
  useUsernameAvailability,
} from "../../lib/use-username-availability";
import { typedUsername } from "../../lib/username";

/** O @ da conta, conferido enquanto a pessoa digita (o mesmo do onboarding). */
export function UsernameSetting({ username }: { username: string }) {
  const id = useId();
  const [saved, setSaved] = useState(username);
  const [value, setValue] = useState(username);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const availability = useUsernameAvailability(value, saved);

  const problem =
    error ??
    (availability === "taken" ||
    availability === "invalid" ||
    availability === "reserved"
      ? AVAILABILITY_MESSAGES[availability]
      : null);
  const status =
    problem ??
    (availability === "checking"
      ? "Conferindo…"
      : availability
        ? AVAILABILITY_MESSAGES[availability]
        : null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (value === saved || problem) return;
    startSaving(async () => {
      const result = await changeUsername(value);
      if (!result.ok) {
        setError(result.fieldErrors?.username ?? result.error);
        return;
      }
      setSaved(result.data.username);
      // A action atualiza a página (a barra e o link do perfil leem o @ no servidor)
      toast(`Seu @ agora é @${result.data.username}`);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-1.5">
      <Label htmlFor={`${id}-usuario`}>Seu @</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-sm text-muted-foreground"
          >
            @
          </span>
          <Input
            id={`${id}-usuario`}
            value={value}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className="pl-7"
            aria-invalid={problem ? true : undefined}
            aria-describedby={`${id}-usuario-status`}
            onChange={(event) => {
              setError(null);
              setValue(typedUsername(event.target.value));
            }}
          />
        </div>
        <Button
          type="submit"
          variant="outline"
          disabled={saving || value === saved || Boolean(problem)}
          aria-busy={saving}
        >
          <SwapText text={saving ? "Salvando…" : "Salvar @"} />
        </Button>
      </div>
      <p
        id={`${id}-usuario-status`}
        aria-live="polite"
        className={
          problem
            ? "text-xs text-destructive"
            : "flex items-center gap-1 text-xs text-muted-foreground"
        }
      >
        {!problem && availability === "available" ? (
          <Check className="size-3.5" aria-hidden />
        ) : null}
        {status ?? "O endereço do seu perfil muda junto."}
      </p>
    </form>
  );
}
