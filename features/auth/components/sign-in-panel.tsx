"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "motion/react";
import { startTransition, useActionState, useId, useState } from "react";
import { type Resolver, type ResolverResult, useForm } from "react-hook-form";
import { SwapText } from "@/components/motion/swap-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tweens } from "@/lib/motion";
import { sendMagicLink, signIn } from "../actions";
import { magicLinkSchema, signInSchema, type SignInValues } from "../schemas";
import { AuthDivider, FieldError } from "./auth-card";
import { EmailSent } from "./email-sent";
import { FormAlert } from "./form-alert";
import { GoogleSignIn } from "./google-sign-in";
import { PasswordInput } from "./password-input";

type Mode = "password" | "magic";

const passwordResolver = zodResolver(signInSchema);
const magicResolver = zodResolver(magicLinkSchema);

/** Entrar com o Google, com e-mail e senha ou com o link mágico (spec §5.2). */
export function SignInPanel({
  next,
  initialError,
}: {
  next: string | null;
  initialError: string | null;
}) {
  const [showInitial, setShowInitial] = useState(true);
  const [attempt, setAttempt] = useState({
    count: 0,
    mode: "password" as Mode,
  });
  const dismiss = () => setShowInitial(false);

  return (
    <div className="flex flex-col gap-5">
      <FormAlert message={showInitial ? initialError : null} />
      <GoogleSignIn next={next} onSubmitStart={dismiss} />
      <AuthDivider />
      {/* "Usar outro e-mail" monta o formulário de novo, no mesmo modo */}
      <CredentialsForm
        key={attempt.count}
        next={next}
        initialMode={attempt.mode}
        onSubmitStart={dismiss}
        onReset={(mode) =>
          setAttempt((current) => ({ count: current.count + 1, mode }))
        }
      />
    </div>
  );
}

function CredentialsForm({
  next,
  initialMode,
  onSubmitStart,
  onReset,
}: {
  next: string | null;
  initialMode: Mode;
  onSubmitStart: () => void;
  onReset: (mode: Mode) => void;
}) {
  const id = useId();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [lastSent, setLastSent] = useState<Mode | null>(null);
  const [signInState, signInAction, signingIn] = useActionState(signIn, null);
  const [magicState, magicAction, sending] = useActionState(
    sendMagicLink,
    null,
  );

  // O link mágico só confere o e-mail; o valor que segue é o do formulário
  const resolver: Resolver<SignInValues> = (values, context, options) =>
    mode === "password"
      ? passwordResolver(values, context, options)
      : (magicResolver(values, context, options as never) as Promise<
          ResolverResult<SignInValues>
        >);
  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver,
    defaultValues: { email: "", password: "" },
  });

  if (magicState?.ok) {
    return (
      <EmailSent email={magicState.data.email} onReset={() => onReset("magic")}>
        Abra neste mesmo navegador para entrar.
      </EmailSent>
    );
  }

  const action = mode === "password" ? signInAction : magicAction;
  const pending = signingIn || sending;
  const sent =
    lastSent === "password"
      ? signInState
      : lastSent === "magic"
        ? magicState
        : null;
  const serverFields = sent && !sent.ok ? sent.fieldErrors : undefined;
  const emailError = errors.email?.message ?? serverFields?.email;
  const passwordError = errors.password?.message ?? serverFields?.password;
  const errorId = (name: string) => `${id}-${name}-erro`;

  const submit = handleSubmit((_values, event) => {
    // O form vem do evento: o currentTarget já é null depois da validação
    const form = event?.target;
    if (!(form instanceof HTMLFormElement)) return;
    onSubmitStart();
    setLastSent(mode);
    const data = new FormData(form);
    startTransition(() => action(data));
  });

  function toggleMode() {
    clearErrors();
    setLastSent(null);
    setMode((current) => (current === "password" ? "magic" : "password"));
  }

  const submitLabel =
    mode === "password"
      ? signingIn
        ? "Entrando…"
        : "Entrar"
      : sending
        ? "Enviando…"
        : "Enviar link";

  return (
    <div className="flex flex-col gap-3">
      <form
        action={action}
        onSubmit={submit}
        noValidate
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="next" value={next ?? ""} />
        <FormAlert message={sent && !sent.ok ? sent.error : null} />

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

        {/* Senha e explicação dividem a mesma célula, com a altura do campo de
            senha (rótulo, espaço e campo): a troca não mexe no cartão */}
        <div className="grid min-h-16.5">
          <AnimatePresence initial={false}>
            {mode === "password" ? (
              <motion.div
                key="senha"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: tweens.base }}
                exit={{ opacity: 0, transition: tweens.fast }}
                className="col-start-1 row-start-1 flex flex-col gap-1.5"
              >
                <Label htmlFor={`${id}-senha`}>Senha</Label>
                <PasswordInput
                  id={`${id}-senha`}
                  autoComplete="current-password"
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={
                    passwordError ? errorId("senha") : undefined
                  }
                  {...register("password")}
                />
                <FieldError id={errorId("senha")} message={passwordError} />
              </motion.div>
            ) : (
              <motion.p
                key="link"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: tweens.base }}
                exit={{ opacity: 0, transition: tweens.fast }}
                className="col-start-1 row-start-1 self-center text-sm text-pretty text-muted-foreground"
              >
                Sem senha: mandamos um link para o seu e-mail, e é só tocar nele
                para entrar.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full"
          disabled={pending}
          aria-busy={pending}
        >
          <SwapText text={submitLabel} />
        </Button>
      </form>

      <Button
        type="button"
        variant="link"
        className="self-center text-muted-foreground hover:text-foreground"
        onClick={toggleMode}
      >
        <SwapText
          text={
            mode === "password" ? "Receber link mágico" : "Entrar com senha"
          }
        />
      </Button>
    </div>
  );
}
