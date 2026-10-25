import type { z } from "zod";

/**
 * Resposta de toda Server Action: erro esperado nunca vira exceção. Com
 * `fieldErrors`, a mensagem aparece embaixo do campo; `error` vai no topo.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Primeira mensagem de cada campo, pelo caminho (`profile.username`). */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.map(String).join(".");
    errors[field] ??= issue.message;
  }
  return errors;
}
