"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SwapText } from "@/components/motion/swap-text";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/features/auth/components/auth-card";
import { FormAlert } from "@/features/auth/components/form-alert";
import { PasswordInput } from "@/features/auth/components/password-input";
import { PASSWORD_MIN } from "@/features/auth/schemas";
import { changePassword } from "../../actions";
import { type PasswordChangeValues, passwordChangeSchema } from "../../schemas";

/**
 * Senha nova, com confirmação. Quem tem senha confirma com a atual; quem
 * nunca teve (Google, link mágico) cria a primeira logo depois de entrar.
 */
export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const id = useId();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { password: "", confirm: "", current: "" },
  });

  const submit = handleSubmit((values) => {
    setServerError(null);
    startSaving(async () => {
      const result = await changePassword(values);
      if (result.ok) {
        reset();
        toast("Senha trocada");
        return;
      }
      const fields = Object.entries(result.fieldErrors ?? {});
      for (const [field, message] of fields) {
        if (
          field === "password" ||
          field === "confirm" ||
          field === "current"
        ) {
          setError(field, { message });
        }
      }
      if (fields.length === 0) setServerError(result.error);
    });
  });

  const errorId = (name: string) => `${id}-${name}-erro`;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormAlert message={serverError} />
      {hasPassword ? (
        <div className="flex flex-col gap-1.5 sm:max-w-[calc(50%-0.5rem)]">
          <Label htmlFor={`${id}-atual`}>Senha atual</Label>
          <PasswordInput
            id={`${id}-atual`}
            autoComplete="current-password"
            aria-invalid={errors.current ? true : undefined}
            aria-describedby={errors.current ? errorId("atual") : undefined}
            {...register("current")}
          />
          <FieldError id={errorId("atual")} message={errors.current?.message} />
        </div>
      ) : (
        <p className="text-sm text-pretty text-muted-foreground">
          Você entra pelo Google ou por link no e-mail. Para criar uma senha,
          por segurança, é preciso ter entrado há menos de 10 minutos.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-senha`}>Senha nova</Label>
          <PasswordInput
            id={`${id}-senha`}
            autoComplete="new-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={
              errors.password ? errorId("senha") : `${id}-senha-dica`
            }
            {...register("password")}
          />
          {errors.password ? (
            <FieldError
              id={errorId("senha")}
              message={errors.password.message}
            />
          ) : (
            <p
              id={`${id}-senha-dica`}
              className="text-xs text-muted-foreground"
            >
              {PASSWORD_MIN} caracteres ou mais.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-confirmar`}>Repita a senha</Label>
          <PasswordInput
            id={`${id}-confirmar`}
            autoComplete="new-password"
            aria-invalid={errors.confirm ? true : undefined}
            aria-describedby={errors.confirm ? errorId("confirmar") : undefined}
            {...register("confirm")}
          />
          <FieldError
            id={errorId("confirmar")}
            message={errors.confirm?.message}
          />
        </div>
      </div>
      <Button
        type="submit"
        variant="outline"
        className="self-start"
        disabled={saving}
        aria-busy={saving}
      >
        <SwapText text={saving ? "Trocando…" : "Trocar senha"} />
      </Button>
    </form>
  );
}
