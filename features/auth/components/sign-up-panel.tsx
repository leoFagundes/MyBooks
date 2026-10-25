"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { SwapText } from "@/components/motion/swap-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "../actions";
import { PASSWORD_MIN, signUpSchema, type SignUpValues } from "../schemas";
import { AuthDivider, FieldError } from "./auth-card";
import { EmailSent } from "./email-sent";
import { FormAlert } from "./form-alert";
import { GoogleSignIn } from "./google-sign-in";
import { PasswordInput } from "./password-input";

/** Criar conta com e-mail e senha ou com o Google (spec §5.2). */
export function SignUpPanel({ next }: { next: string | null }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <div className="flex flex-col gap-5">
      <GoogleSignIn next={next} onSubmitStart={() => {}} />
      <AuthDivider />
      <SignUpForm
        key={attempt}
        onReset={() => setAttempt((count) => count + 1)}
      />
    </div>
  );
}

function SignUpForm({ onReset }: { onReset: () => void }) {
  const id = useId();
  const [state, formAction, pending] = useActionState(signUp, null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "" },
  });

  if (state?.ok) {
    return (
      <EmailSent email={state.data.email} onReset={onReset}>
        Abra neste mesmo navegador para confirmar e começar. Se esse e-mail já
        tiver conta, é só entrar.
      </EmailSent>
    );
  }

  const serverFields = state && !state.ok ? state.fieldErrors : undefined;
  const emailError = errors.email?.message ?? serverFields?.email;
  const passwordError = errors.password?.message ?? serverFields?.password;
  const errorId = (name: string) => `${id}-${name}-erro`;

  const submit = handleSubmit((_values, event) => {
    // O form vem do evento: o currentTarget já é null depois da validação
    const form = event?.target;
    if (!(form instanceof HTMLFormElement)) return;
    const data = new FormData(form);
    startTransition(() => formAction(data));
  });

  return (
    <form
      action={formAction}
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-4"
    >
      <FormAlert message={state && !state.ok ? state.error : null} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-email`}>E-mail</Label>
        <Input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? errorId("email") : undefined}
          {...register("email")}
        />
        <FieldError id={errorId("email")} message={emailError} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-senha`}>Senha</Label>
        <PasswordInput
          id={`${id}-senha`}
          autoComplete="new-password"
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={
            passwordError ? errorId("senha") : `${id}-senha-dica`
          }
          {...register("password")}
        />
        {passwordError ? (
          <FieldError id={errorId("senha")} message={passwordError} />
        ) : (
          <p id={`${id}-senha-dica`} className="text-xs text-muted-foreground">
            {PASSWORD_MIN} caracteres ou mais.
          </p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        className="mt-1 w-full"
        disabled={pending}
        aria-busy={pending}
      >
        <SwapText text={pending ? "Criando…" : "Criar conta"} />
      </Button>
    </form>
  );
}
