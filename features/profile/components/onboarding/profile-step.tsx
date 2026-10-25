"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useEffect, useId, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { SwapText } from "@/components/motion/swap-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveProfile } from "../../actions";
import { typedUsername, type UsernameAvailability } from "../../lib/username";
import { profileStepSchema } from "../../schemas";
import { type AvatarValue, AvatarPicker } from "./avatar-picker";
import { StepFrame } from "./step-frame";

export type ProfileDraft = {
  displayName: string;
  username: string;
  avatar: AvatarValue;
};

const fieldsSchema = profileStepSchema.pick({
  displayName: true,
  username: true,
});
type Fields = z.input<typeof fieldsSchema>;

const MESSAGES: Record<UsernameAvailability, string> = {
  available: "Disponível",
  yours: "Esse é o seu @",
  taken: "Esse @ já tem dono",
  invalid: "Use de 3 a 20 letras, números ou _",
  reserved: "Esse @ é reservado",
};

/** Confere o @ com debounce; enquanto a resposta não chega, "conferindo". */
function useAvailability(username: string, own: string) {
  const [answer, setAnswer] = useState<{
    username: string;
    status: UsernameAvailability;
  } | null>(null);

  useEffect(() => {
    if (!username || username === own) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/usernames/availability?username=${encodeURIComponent(username)}`,
          { signal: controller.signal },
        );
        const { status } = (await response.json()) as {
          status: UsernameAvailability;
        };
        setAnswer({ username, status });
      } catch {
        // Cancelada pela próxima letra, ou sem rede: o salvar confere de novo
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [username, own]);

  if (!username) return null;
  if (username === own) return "yours" as const;
  return answer?.username === username ? answer.status : ("checking" as const);
}

export function ProfileStep({
  userId,
  ownUsername,
  draft,
  focusTitle,
  onSaved,
}: {
  userId: string;
  ownUsername: string;
  draft: ProfileDraft;
  focusTitle: boolean;
  onSaved: (draft: ProfileDraft) => void;
}) {
  const id = useId();
  const [avatar, setAvatar] = useState(draft.avatar);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(fieldsSchema),
    defaultValues: {
      displayName: draft.displayName,
      username: draft.username,
    },
  });
  const name = useWatch({ control, name: "displayName" });
  const username = useWatch({ control, name: "username" });
  const availability = useAvailability(username, ownUsername);

  const submit = handleSubmit((values) => {
    setServerError(null);
    if (availability === "taken") {
      setError("username", { message: MESSAGES.taken });
      return;
    }
    startSaving(async () => {
      const result = await saveProfile({ ...values, avatarPath: avatar.path });
      if (result.ok) {
        onSaved({
          displayName: values.displayName.trim(),
          username: values.username,
          avatar: { path: null, preview: avatar.preview },
        });
        return;
      }
      const fields = Object.entries(result.fieldErrors ?? {});
      for (const [field, message] of fields) {
        if (field === "displayName" || field === "username") {
          setError(field, { message });
        }
      }
      if (fields.length === 0) setServerError(result.error);
    });
  });

  const usernameError = errors.username?.message;
  const status =
    availability && availability !== "checking"
      ? MESSAGES[availability]
      : availability === "checking"
        ? "Conferindo…"
        : null;
  const statusIsProblem =
    availability === "taken" ||
    availability === "invalid" ||
    availability === "reserved";

  return (
    <form onSubmit={submit} noValidate>
      <StepFrame
        title="Como você quer aparecer?"
        description="Seu nome e seu @ ficam no seu perfil. Dá para mudar depois."
        focusTitle={focusTitle}
        footer={
          <>
            <span />
            <Button
              type="submit"
              size="lg"
              disabled={saving}
              aria-busy={saving}
            >
              <SwapText text={saving ? "Salvando…" : "Continuar"} />
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <AvatarPicker
            userId={userId}
            name={name || draft.username}
            value={avatar}
            onChange={setAvatar}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-nome`}>Seu nome</Label>
            <Input
              id={`${id}-nome`}
              autoComplete="name"
              autoFocus={!focusTitle}
              aria-invalid={errors.displayName ? true : undefined}
              aria-describedby={
                errors.displayName ? `${id}-nome-erro` : undefined
              }
              {...register("displayName")}
            />
            {errors.displayName ? (
              <p id={`${id}-nome-erro`} className="text-xs text-destructive">
                {errors.displayName.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-usuario`}>Seu @</Label>
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-sm text-muted-foreground"
              >
                @
              </span>
              <Controller
                control={control}
                name="username"
                render={({ field }) => (
                  <Input
                    id={`${id}-usuario`}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="pl-7"
                    aria-invalid={usernameError ? true : undefined}
                    aria-describedby={`${id}-usuario-status`}
                    name={field.name}
                    ref={field.ref}
                    value={field.value}
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      field.onChange(typedUsername(event.target.value))
                    }
                  />
                )}
              />
            </div>
            <p
              id={`${id}-usuario-status`}
              aria-live="polite"
              className={
                usernameError || statusIsProblem
                  ? "text-xs text-destructive"
                  : "flex items-center gap-1 text-xs text-muted-foreground"
              }
            >
              {usernameError ?? (
                <>
                  {availability === "available" || availability === "yours" ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : null}
                  {status}
                </>
              )}
            </p>
          </div>

          {serverError ? (
            <p role="alert" className="text-sm text-destructive">
              {serverError}
            </p>
          ) : null}
        </div>
      </StepFrame>
    </form>
  );
}
