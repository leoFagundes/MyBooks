import type { z } from "zod";

/**
 * Resposta de toda Server Action: erro esperado nunca vira exceção. Com
 * `fieldErrors`, a mensagem aparece embaixo do campo; `error` vai no topo.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** O erro esperado de uma Server Action, como exceção (para o toast.promise). */
export class ActionError extends Error {}

/**
 * A Server Action como promessa que rejeita no erro esperado: o toast.promise
 * do Sonner leva um toast só do carregando ao pronto, ou ao erro.
 */
export async function unwrapAction<T>(
  pending: Promise<ActionResult<T>>,
): Promise<T> {
  const result = await pending;
  if (!result.ok) throw new ActionError(result.error);
  return result.data;
}

/** A mensagem do toast de erro: a da ação ou, se a rede caiu, uma genérica. */
export function actionErrorMessage(error: unknown): string {
  return error instanceof ActionError
    ? error.message
    : "Algo não deu certo. Tente de novo em instantes.";
}

/** Primeira mensagem de cada campo, pelo caminho (`profile.username`). */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.map(String).join(".");
    errors[field] ??= issue.message;
  }
  return errors;
}
