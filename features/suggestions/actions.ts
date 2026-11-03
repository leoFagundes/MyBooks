"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getStaff } from "@/features/admin/queries";
import { postingError } from "@/features/community/schemas";
import { type ActionResult, fieldErrorsFrom } from "@/lib/action";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SUGGESTION_STATUSES } from "./types";

const FAILED = {
  ok: false,
  error: "Não deu para concluir agora. Tente de novo.",
} as const;

const suggestionSchema = z.object({
  title: z
    .string({ error: "Dê um título" })
    .trim()
    .min(5, "Um título com pelo menos 5 letras")
    .max(120, "Até 120 caracteres"),
  body: z
    .string({ error: "Conte a ideia" })
    .trim()
    .min(1, "Conte a ideia")
    .max(5000, "Até 5.000 caracteres"),
  category: z.enum(["funcionalidade", "melhoria", "bug", "outro"], {
    error: "Escolha a categoria",
  }),
});

export type SuggestionInput = z.input<typeof suggestionSchema>;

/** Envia uma sugestão (MELHORIAS 8.2). Quem sugere já vota nela. */
export async function createSuggestion(
  input: SuggestionInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = suggestionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Confira os campos.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const viewer = await requireViewer();
  const supabase = await createClient();
  const id = randomUUID();
  const { error } = await supabase
    .from("feature_suggestions")
    .insert({ id, author_id: viewer.id, ...parsed.data });
  if (error) return { ok: false, error: postingError(error) };
  return { ok: true, data: { id } };
}

/** Votar (um por pessoa) ou tirar o voto. */
export async function toggleVote(
  suggestionId: string,
  on: boolean,
): Promise<ActionResult> {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = on
    ? await supabase
        .from("suggestion_votes")
        .insert({ suggestion_id: suggestionId, user_id: viewer.id })
    : await supabase
        .from("suggestion_votes")
        .delete()
        .eq("suggestion_id", suggestionId)
        .eq("user_id", viewer.id);
  if (error && error.code !== "23505") return FAILED;
  return { ok: true, data: undefined };
}

const commentSchema = z
  .string({ error: "Escreva o comentário" })
  .trim()
  .min(1, "Escreva o comentário")
  .max(3000, "Até 3.000 caracteres");

export async function createComment(
  suggestionId: string,
  text: string,
): Promise<ActionResult> {
  const parsed = commentSchema.safeParse(text);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira." };
  }
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.from("suggestion_comments").insert({
    suggestion_id: suggestionId,
    author_id: viewer.id,
    body: parsed.data,
  });
  if (error) return { ok: false, error: postingError(error) };
  return { ok: true, data: undefined };
}

/** Exclui a própria sugestão ou o próprio comentário. */
export async function deleteOwn(
  kind: "suggestion" | "comment",
  id: string,
): Promise<ActionResult> {
  await requireViewer();
  const supabase = await createClient();
  const table =
    kind === "suggestion" ? "feature_suggestions" : "suggestion_comments";
  const { data, error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return FAILED;
  return { ok: true, data: undefined };
}

const statusSchema = z.object({
  suggestionId: z.uuid(),
  status: z.enum(
    SUGGESTION_STATUSES.map((item) => item.value) as [string, ...string[]],
  ),
  response: z.string().trim().max(2000, "Até 2.000 caracteres"),
});

/** O admin muda o status e escreve a resposta oficial; quem votou é avisado. */
export async function setSuggestionStatus(
  input: z.input<typeof statusSchema>,
): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira." };
  }
  const staff = await getStaff();
  if (staff?.role !== "admin") {
    return { ok: false, error: "Só o admin muda o status." };
  }
  const supabase = await createClient();
  const { suggestionId, status, response } = parsed.data;
  const { error } = await supabase.rpc("set_suggestion_status", {
    suggestion: suggestionId,
    new_status: status,
    response,
  });
  if (error) return FAILED;
  await createAdminClient()
    .from("admin_audit_log")
    .insert({
      actor_id: staff.id,
      action: "sugestao.status",
      target_type: "sugestao",
      target_id: suggestionId,
      after: { status, resposta: response || null },
    })
    .then(
      () => undefined,
      () => undefined,
    );
  return { ok: true, data: undefined };
}

/** A equipe oculta (ou mostra) uma sugestão ou um comentário. */
export async function hideSuggestionContent(
  kind: "suggestion" | "comment",
  id: string,
  hide: boolean,
): Promise<ActionResult> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: "Você não tem permissão para isso." };
  const admin = createAdminClient();
  const table =
    kind === "suggestion" ? "feature_suggestions" : "suggestion_comments";
  const { error } = await admin
    .from(table)
    .update({ hidden_at: hide ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return FAILED;
  return { ok: true, data: undefined };
}
