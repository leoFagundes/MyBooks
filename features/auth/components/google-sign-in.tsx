"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "../actions";
import { FormAlert } from "./form-alert";

// O "G" numa cor só: a cor da tela vem das capas (spec §2)
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.83h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.33ZM12 22c2.7 0 4.98-.9 6.63-2.43l-3.24-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.58A10 10 0 0 0 12 22Zm-5.6-8.1a6 6 0 0 1 0-3.8V7.52H3.06a10 10 0 0 0 0 8.96L6.4 13.9ZM12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.52L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98Z"
      />
    </svg>
  );
}

export function GoogleSignIn({
  next,
  onSubmitStart,
}: {
  next: string | null;
  onSubmitStart: () => void;
}) {
  const [state, formAction, pending] = useActionState(signInWithGoogle, null);
  return (
    <form
      action={formAction}
      onSubmit={onSubmitStart}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="next" value={next ?? ""} />
      <Button
        type="submit"
        variant="outline"
        size="lg"
        className="w-full"
        disabled={pending}
        aria-busy={pending}
      >
        <GoogleMark />
        Continuar com Google
      </Button>
      <FormAlert message={state && !state.ok ? state.error : null} />
    </form>
  );
}
