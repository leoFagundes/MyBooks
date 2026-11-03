"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { getStaff } from "@/features/admin/queries";
import { type ActionResult, fieldErrorsFrom } from "@/lib/action";
import { requireViewer } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { bookIdsIn } from "./lib/markdown";
import {
  postingError,
  type ReplyInput,
  type ReportInput,
  replySchema,
  reportSchema,
  type TopicInput,
  topicSchema,
} from "./schemas";
import type { ReactionKind } from "./types";

const FAILED = {
  ok: false,
  error: "Não deu para concluir agora. Tente de novo.",
} as const;

// Os livros do tópico: os escolhidos e os citados no texto, até 5
async function linkBooks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  topicId: string,
  chosen: string[],
  body: string,
) {
  const ids = [...new Set([...chosen, ...bookIdsIn(body)])].slice(0, 5);
  await supabase.from("forum_topic_books").delete().eq("topic_id", topicId);
  if (ids.length > 0) {
    await supabase
      .from("forum_topic_books")
      .insert(ids.map((book_id) => ({ topic_id: topicId, book_id })));
  }
  return ids;
}

function refreshForum(bookIds: string[] = []) {
  updateTag("forum");
  for (const id of bookIds) updateTag(`book:${id}`);
}

/** Abre um tópico (MELHORIAS 8). O anti-spam do banco pode barrar. */
export async function createTopic(
  input: TopicInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = topicSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Confira os campos.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const viewer = await requireViewer();
  const data = parsed.data;
  const supabase = await createClient();
  const { data: category } = await supabase
    .from("forum_categories")
    .select("id")
    .eq("slug", data.category)
    .maybeSingle();
  if (!category) return { ok: false, error: "Escolha a categoria." };
  const id = randomUUID();
  const { error } = await supabase.from("forum_topics").insert({
    id,
    category_id: category.id,
    author_id: viewer.id,
    title: data.title,
    body: data.body,
    tags: data.tags,
    contains_spoilers: data.containsSpoilers,
  });
  if (error) return { ok: false, error: postingError(error) };
  const books = await linkBooks(supabase, id, data.bookIds, data.body);
  refreshForum(books);
  return { ok: true, data: { id } };
}

/** Edita o próprio tópico: fica a marca de editado. */
export async function updateTopic(
  topicId: string,
  input: TopicInput,
): Promise<ActionResult> {
  const parsed = topicSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Confira os campos.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  await requireViewer();
  const data = parsed.data;
  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("forum_topics")
    .update({
      title: data.title,
      body: data.body,
      tags: data.tags,
      contains_spoilers: data.containsSpoilers,
      edited_at: new Date().toISOString(),
    })
    .eq("id", topicId)
    .select("id");
  if (error || !updated?.length) return FAILED;
  const books = await linkBooks(supabase, topicId, data.bookIds, data.body);
  refreshForum(books);
  return { ok: true, data: undefined };
}

/** Exclui o próprio tópico (some da lista; as respostas vão junto). */
export async function deleteTopic(topicId: string): Promise<ActionResult> {
  await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forum_topics")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", topicId)
    .select("id");
  if (error || !data?.length) return FAILED;
  refreshForum();
  return { ok: true, data: undefined };
}

/** Responde a um tópico (ou a uma resposta, num nível só), citando ou não. */
export async function createReply(
  input: ReplyInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Confira a resposta.",
    };
  }
  const viewer = await requireViewer();
  const data = parsed.data;
  const supabase = await createClient();
  const id = randomUUID();
  const { error } = await supabase.from("forum_replies").insert({
    id,
    topic_id: data.topicId,
    author_id: viewer.id,
    body: data.body,
    parent_id: data.parentId,
    quoted_reply_id: data.quotedReplyId,
  });
  if (error) {
    return {
      ok: false,
      error: postingError(
        error,
        "Esse tópico está trancado ou não aceita respostas.",
      ),
    };
  }
  refreshForum();
  return { ok: true, data: { id } };
}

export async function updateReply(
  replyId: string,
  text: string,
): Promise<ActionResult> {
  const parsed = replySchema.shape.body.safeParse(text);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira." };
  }
  await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forum_replies")
    .update({ body: parsed.data, edited_at: new Date().toISOString() })
    .eq("id", replyId)
    .select("id");
  if (error || !data?.length) return FAILED;
  return { ok: true, data: undefined };
}

/** Exclui a própria resposta: fica o lugar dela ("resposta excluída"). */
export async function deleteReply(replyId: string): Promise<ActionResult> {
  await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forum_replies")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", replyId)
    .select("id");
  if (error || !data?.length) return FAILED;
  refreshForum();
  return { ok: true, data: undefined };
}

/** Curtir ou marcar como útil; de novo, desfaz. */
export async function toggleReaction(input: {
  target: "topic" | "reply";
  id: string;
  kind: ReactionKind;
  on: boolean;
}): Promise<ActionResult> {
  if (!["like", "useful"].includes(input.kind)) return FAILED;
  const viewer = await requireViewer();
  const supabase = await createClient();
  const column = input.target === "topic" ? "topic_id" : "reply_id";
  const { error } = input.on
    ? await supabase.from("forum_reactions").insert({
        user_id: viewer.id,
        kind: input.kind,
        topic_id: input.target === "topic" ? input.id : null,
        reply_id: input.target === "reply" ? input.id : null,
      })
    : await supabase
        .from("forum_reactions")
        .delete()
        .eq("user_id", viewer.id)
        .eq("kind", input.kind)
        .eq(column, input.id);
  // Duas abas: a reação que já existe não é erro
  if (error && error.code !== "23505") return FAILED;
  if (input.target === "topic") updateTag("forum");
  return { ok: true, data: undefined };
}

/** Seguir um tópico: aviso a cada resposta. */
export async function toggleSubscription(
  topicId: string,
  on: boolean,
): Promise<ActionResult> {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = on
    ? await supabase
        .from("forum_subscriptions")
        .insert({ topic_id: topicId, user_id: viewer.id })
    : await supabase
        .from("forum_subscriptions")
        .delete()
        .eq("topic_id", topicId)
        .eq("user_id", viewer.id);
  if (error && error.code !== "23505") return FAILED;
  return { ok: true, data: undefined };
}

/** Denuncia um tópico, resposta, sugestão ou comentário: vai à fila da equipe. */
export async function reportContent(input: ReportInput): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira." };
  }
  const viewer = await requireViewer();
  const data = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("content_reports").insert({
    reporter_id: viewer.id,
    target_type: data.targetType,
    target_id: data.targetId,
    reason: data.reason,
    details: data.details || null,
  });
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "Você já denunciou isso. A equipe vai olhar."
          : FAILED.error,
    };
  }
  return { ok: true, data: undefined };
}

const TOPIC_ACTIONS = [
  "pin",
  "unpin",
  "lock",
  "unlock",
  "hide",
  "unhide",
  "move",
] as const;
type TopicAction = (typeof TOPIC_ACTIONS)[number];

/** A equipe: fixar, trancar, mover e ocultar um tópico (na auditoria). */
export async function moderateTopic(
  topicId: string,
  action: TopicAction,
  category?: string,
): Promise<ActionResult> {
  if (!TOPIC_ACTIONS.includes(action)) return FAILED;
  const staff = await getStaff();
  if (!staff) return { ok: false, error: "Você não tem permissão para isso." };
  const supabase = await createClient();
  let categoryId: string | undefined;
  if (action === "move") {
    const { data } = await supabase
      .from("forum_categories")
      .select("id")
      .eq("slug", category ?? "")
      .maybeSingle();
    if (!data) return { ok: false, error: "Escolha a categoria." };
    categoryId = data.id;
  }
  const { error } = await supabase.rpc("moderate_topic", {
    topic: topicId,
    action,
    category: categoryId,
  });
  if (error) return FAILED;
  await createAdminClient()
    .from("admin_audit_log")
    .insert({
      actor_id: staff.id,
      action: `forum.${action}`,
      target_type: "topico",
      target_id: topicId,
      after: category ? { categoria: category } : null,
    })
    .then(
      () => undefined,
      () => undefined,
    );
  refreshForum();
  return { ok: true, data: undefined };
}

/** A equipe oculta (ou mostra) uma resposta. */
export async function moderateReply(
  replyId: string,
  hide: boolean,
): Promise<ActionResult> {
  const staff = await getStaff();
  if (!staff) return { ok: false, error: "Você não tem permissão para isso." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("forum_replies")
    .update({ hidden_at: hide ? new Date().toISOString() : null })
    .eq("id", replyId);
  if (error) return FAILED;
  await admin
    .from("admin_audit_log")
    .insert({
      actor_id: staff.id,
      action: hide ? "forum.ocultar-resposta" : "forum.mostrar-resposta",
      target_type: "resposta",
      target_id: replyId,
    })
    .then(
      () => undefined,
      () => undefined,
    );
  return { ok: true, data: undefined };
}
