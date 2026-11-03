"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action";
import type { Json } from "@/lib/supabase/database.types";
import { diffFields, proposedFields } from "@/features/books/lib/book-changes";
import {
  type ManualBookFields,
  manualBookSchema,
} from "@/features/books/schemas";
import { genreSlug } from "@/features/profile/lib/genre-name";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStaff, type Staff, type StaffRole } from "./queries";
import {
  bannerSchema,
  featuresSchema,
  liftSanctionSchema,
  maintenanceSchema,
  moderateBookSchema,
  moderatorSchema,
  removeContentSchema,
  reviewBookSchema,
  reviewGenreSchema,
  reviewRequestSchema,
  sanctionSchema,
} from "./schemas";

type Admin = ReturnType<typeof createAdminClient>;

const DENIED = {
  ok: false,
  error: "Você não tem permissão para isso.",
} as const;
const FAILED = {
  ok: false,
  error: "Não deu para concluir agora. Tente de novo.",
} as const;
// "Para sempre" no Auth: o banimento não tem prazo
const BAN_FOREVER = "876000h";

function invalid(error: z.ZodError): ActionResult<never> {
  return { ok: false, error: error.issues[0]?.message ?? "Dados inválidos" };
}

/** A terceira camada do /admin: cada ação confere o papel de novo. */
async function staffWith(level: StaffRole): Promise<Staff | null> {
  const staff = await getStaff();
  if (!staff || (level === "admin" && staff.role !== "admin")) return null;
  return staff;
}

async function audit(
  admin: Admin,
  staff: Staff,
  entry: {
    action: string;
    targetType: string;
    targetId: string | null;
    before?: unknown;
    after?: unknown;
    reason?: string | null;
  },
) {
  const { error } = await admin.from("admin_audit_log").insert({
    actor_id: staff.id,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId,
    before: (entry.before ?? null) as Json,
    after: (entry.after ?? null) as Json,
    reason: entry.reason ?? null,
  });
  if (error) throw error;
}

// A pessoa alvo e o papel dela. Ninguém age sobre si mesmo, e só o admin age
// sobre alguém da equipe
async function targetOf(admin: Admin, staff: Staff, userId: string) {
  if (userId === staff.id) return null;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, username")
      .eq("id", userId)
      .maybeSingle(),
    admin.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (!profile) return null;
  const isStaff = (roles ?? []).length > 0;
  if (isStaff && staff.role !== "admin") return null;
  return { ...profile, isStaff };
}

/** Suspende (com prazo) ou bane (sem prazo): o Auth deixa de aceitar a conta. */
export async function sanctionUser(input: unknown): Promise<ActionResult> {
  const parsed = sanctionSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;
  const staff = await staffWith(data.kind === "ban" ? "admin" : "moderator");
  if (!staff) return DENIED;
  const admin = createAdminClient();
  const target = await targetOf(admin, staff, data.userId);
  if (!target) return DENIED;

  const endsAt =
    data.kind === "suspension"
      ? new Date(Date.now() + data.days * 86_400_000).toISOString()
      : null;
  try {
    const banned = await admin.auth.admin.updateUserById(data.userId, {
      ban_duration:
        data.kind === "suspension" ? `${data.days * 24}h` : BAN_FOREVER,
    });
    if (banned.error) throw banned.error;
    // Uma sanção vale por vez: a nova substitui a que estava valendo
    await admin
      .from("account_sanctions")
      .update({ lifted_at: new Date().toISOString(), lifted_by: staff.id })
      .eq("user_id", data.userId)
      .is("lifted_at", null);
    const { data: sanction, error } = await admin
      .from("account_sanctions")
      .insert({
        user_id: data.userId,
        kind: data.kind,
        reason: data.reason,
        ends_at: endsAt,
        created_by: staff.id,
      })
      .select("id")
      .single();
    if (error) throw error;
    await audit(admin, staff, {
      action: data.kind === "ban" ? "usuario.banir" : "usuario.suspender",
      targetType: "usuario",
      targetId: data.userId,
      before: null,
      after: { sanction: sanction.id, kind: data.kind, endsAt },
      reason: data.reason,
    });
  } catch {
    return FAILED;
  }
  return { ok: true, data: undefined };
}

/** Tira a suspensão ou o banimento que estão valendo. */
export async function liftSanction(input: unknown): Promise<ActionResult> {
  const parsed = liftSanctionSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const staff = await staffWith("moderator");
  if (!staff) return DENIED;
  const admin = createAdminClient();
  const target = await targetOf(admin, staff, parsed.data.userId);
  if (!target) return DENIED;
  try {
    const { data: active, error: reading } = await admin
      .from("account_sanctions")
      .select("id, kind, ends_at")
      .eq("user_id", target.id)
      .is("lifted_at", null);
    if (reading) throw reading;
    // Só o admin tira um banimento
    if (staff.role !== "admin" && active.some((row) => row.kind === "ban")) {
      return DENIED;
    }
    const { error } = await admin
      .from("account_sanctions")
      .update({ lifted_at: new Date().toISOString(), lifted_by: staff.id })
      .eq("user_id", target.id)
      .is("lifted_at", null);
    if (error) throw error;
    const unbanned = await admin.auth.admin.updateUserById(target.id, {
      ban_duration: "none",
    });
    if (unbanned.error) throw unbanned.error;
    await audit(admin, staff, {
      action: "usuario.tirar-sancao",
      targetType: "usuario",
      targetId: target.id,
      before: active,
      after: null,
      reason: parsed.data.reason,
    });
  } catch {
    return FAILED;
  }
  return { ok: true, data: undefined };
}

/** Remove o que alguém publicou: bio e foto, resenhas, citações. */
export async function removeContent(
  input: unknown,
): Promise<ActionResult<{ removed: Record<string, number> }>> {
  const parsed = removeContentSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const staff = await staffWith("moderator");
  if (!staff) return DENIED;
  const admin = createAdminClient();
  const target = await targetOf(admin, staff, parsed.data.userId);
  if (!target) return DENIED;
  const { parts, reason } = parsed.data;
  const before: Record<string, unknown> = {};
  const removed: Record<string, number> = {};
  const books = new Set<string>();
  try {
    if (parts.includes("perfil")) {
      const { data } = await admin
        .from("profiles")
        .select("bio, avatar_url")
        .eq("id", target.id)
        .single();
      before.perfil = data;
      const { error } = await admin
        .from("profiles")
        .update({ bio: null, avatar_url: null })
        .eq("id", target.id);
      if (error) throw error;
      removed.perfil = 1;
    }
    if (parts.includes("resenhas")) {
      const { data, error } = await admin
        .from("user_books")
        .update({ review: null })
        .eq("user_id", target.id)
        .not("review", "is", null)
        .select("book_id");
      if (error) throw error;
      for (const row of data) books.add(row.book_id);
      removed.resenhas = data.length;
    }
    if (parts.includes("citacoes")) {
      const { data, error } = await admin
        .from("quotes")
        .delete()
        .eq("user_id", target.id)
        .select("id, book_id, text");
      if (error) throw error;
      before.citacoes = data;
      for (const row of data) books.add(row.book_id);
      removed.citacoes = data.length;
    }
    await audit(admin, staff, {
      action: "usuario.remover-conteudo",
      targetType: "usuario",
      targetId: target.id,
      before,
      after: removed,
      reason,
    });
  } catch {
    return FAILED;
  }
  updateTag(`profile:${target.username}`);
  updateTag(`shelf:${target.id}`);
  for (const book of books) updateTag(`book:${book}`);
  return { ok: true, data: { removed } };
}

/** Promove a moderador, ou tira o papel (só o admin). */
export async function setModerator(input: unknown): Promise<ActionResult> {
  const parsed = moderatorSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const staff = await staffWith("admin");
  if (!staff) return DENIED;
  const admin = createAdminClient();
  const target = await targetOf(admin, staff, parsed.data.userId);
  if (!target) return DENIED;
  try {
    const { error } = parsed.data.moderator
      ? await admin
          .from("user_roles")
          .upsert(
            { user_id: target.id, role: "moderator" },
            { onConflict: "user_id,role", ignoreDuplicates: true },
          )
      : await admin
          .from("user_roles")
          .delete()
          .eq("user_id", target.id)
          .eq("role", "moderator");
    if (error) throw error;
    await audit(admin, staff, {
      action: parsed.data.moderator
        ? "usuario.promover-moderador"
        : "usuario.tirar-moderador",
      targetType: "usuario",
      targetId: target.id,
      before: { moderator: !parsed.data.moderator },
      after: { moderator: parsed.data.moderator },
    });
  } catch {
    return FAILED;
  }
  return { ok: true, data: undefined };
}

async function saveSetting(
  key: "banner" | "maintenance" | "features",
  value: Record<string, unknown>,
): Promise<ActionResult> {
  const staff = await staffWith("admin");
  if (!staff) return DENIED;
  const admin = createAdminClient();
  try {
    const { data: previous } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    const { error } = await admin.from("site_settings").upsert({
      key,
      value: value as Json,
      updated_at: new Date().toISOString(),
      updated_by: staff.id,
    });
    if (error) throw error;
    await audit(admin, staff, {
      action: `configuracao.${key}`,
      targetType: "configuracao",
      targetId: key,
      before: previous?.value ?? null,
      after: value,
    });
  } catch {
    return FAILED;
  }
  updateTag("site-settings");
  return { ok: true, data: undefined };
}

export async function saveBanner(input: unknown): Promise<ActionResult> {
  const parsed = bannerSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.enabled && !parsed.data.message) {
    return { ok: false, error: "Escreva o aviso antes de ligar." };
  }
  return saveSetting("banner", parsed.data);
}

export async function saveMaintenance(input: unknown): Promise<ActionResult> {
  const parsed = maintenanceSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return saveSetting("maintenance", parsed.data);
}

export async function saveFeatures(input: unknown): Promise<ActionResult> {
  const parsed = featuresSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  return saveSetting("features", parsed.data);
}

// Quem tem o livro na estante: a mescla muda essas estantes de livro
async function shelvesOf(admin: Admin, bookId: string) {
  const { data } = await admin
    .from("user_books")
    .select("user_id")
    .eq("book_id", bookId);
  return (data ?? []).map((row) => row.user_id);
}

function refreshBooks(bookIds: (string | null)[], userIds: string[] = []) {
  updateTag("catalog");
  updateTag("explore");
  for (const id of bookIds) if (id) updateTag(`book:${id}`);
  for (const id of userIds) updateTag(`shelf:${id}`);
}

/**
 * Revisa um livro manual: aprovar (com ou sem edição), rejeitar com o motivo
 * ou mesclar com o livro de que ele é duplicado. A função do banco confere o
 * papel de novo e avisa quem cadastrou.
 */
export async function reviewManualBook(
  input: unknown,
  edit?: { fields: ManualBookFields; description: string },
): Promise<ActionResult> {
  const parsed = reviewBookSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const staff = await staffWith("moderator");
  if (!staff) return DENIED;
  const data = parsed.data;

  let changes: Record<string, unknown> | null = null;
  if (edit && data.decision === "approve") {
    const fields = manualBookSchema.safeParse(edit.fields);
    if (!fields.success) return invalid(fields.error);
    changes = proposedFields(fields.data, edit.description.trim() || null);
  }
  const admin = createAdminClient();
  const moved =
    data.decision === "merge" ? await shelvesOf(admin, data.bookId) : [];
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_manual_book", {
    book: data.bookId,
    decision: data.decision,
    note: data.decision === "approve" ? undefined : (data.note ?? undefined),
    changes: (changes ?? undefined) as Json | undefined,
    duplicate_of: data.decision === "merge" ? data.duplicateOf : undefined,
  });
  if (error) return { ok: false, error: reviewError(error.message) };
  try {
    await audit(admin, staff, {
      action: `livro.${data.decision === "approve" ? (changes ? "editar-e-aprovar" : "aprovar") : data.decision === "reject" ? "rejeitar" : "mesclar"}`,
      targetType: "livro",
      targetId: data.bookId,
      after:
        changes ??
        (data.decision === "merge" ? { mesclado_em: data.duplicateOf } : null),
      reason: data.decision === "approve" ? null : (data.note ?? null),
    });
  } catch {
    // A decisão valeu; só o registro falhou
  }
  refreshBooks(
    [data.bookId, data.decision === "merge" ? data.duplicateOf : null],
    moved,
  );
  return { ok: true, data: undefined };
}

/** Aprova (aplica a mudança) ou rejeita (com a nota) uma sugestão. */
export async function reviewChangeRequest(
  input: unknown,
): Promise<ActionResult> {
  const parsed = reviewRequestSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const staff = await staffWith("moderator");
  if (!staff) return DENIED;
  const { requestId, approve, note } = parsed.data;
  const admin = createAdminClient();
  const { data: request } = await admin
    .from("book_change_requests")
    .select("book_id, target_book_id, type, changes")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return { ok: false, error: "Essa sugestão não existe mais." };
  const moved =
    approve && request.type === "merge"
      ? await shelvesOf(admin, request.book_id)
      : [];
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_change_request", {
    request: requestId,
    approve,
    note: note || undefined,
  });
  if (error) return { ok: false, error: reviewError(error.message) };
  try {
    await audit(admin, staff, {
      action: approve ? "sugestao.aprovar" : "sugestao.rejeitar",
      targetType: "livro",
      targetId: request.book_id,
      after: { tipo: request.type, mudanca: request.changes },
      reason: note || null,
    });
  } catch {
    // Idem
  }
  refreshBooks([request.book_id, request.target_book_id], moved);
  return { ok: true, data: undefined };
}

/** Aprova ou recusa um gênero criado por um leitor (MELHORIAS 5.4). */
export async function reviewGenre(input: unknown): Promise<ActionResult> {
  const parsed = reviewGenreSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const staff = await staffWith("moderator");
  if (!staff) return DENIED;
  const { slug, approve, note } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_genre", {
    genre_slug: slug,
    approve,
    note: note || undefined,
  });
  if (error) return { ok: false, error: reviewError(error.message) };
  try {
    await audit(createAdminClient(), staff, {
      action: approve ? "genero.aprovar" : "genero.recusar",
      targetType: "genero",
      targetId: slug,
      reason: note || null,
    });
  } catch {
    // Idem
  }
  return { ok: true, data: undefined };
}

// As mensagens das funções do banco, em português, para a janela
function reviewError(message: string) {
  if (message.includes("não encontrad"))
    return "Já foi revisado por outra pessoa.";
  if (message.includes("diga o motivo")) return "Diga o motivo.";
  if (message.includes("consigo mesmo")) return "Escolha outro livro.";
  if (message.includes("não existe"))
    return "O livro que fica não existe mais.";
  return "Não deu para concluir agora. Tente de novo.";
}

/**
 * Exclui (lógico, com o motivo), restaura ou edita um livro pela tela Livros
 * do painel. A função do banco confere o papel e avisa quem cadastrou quando
 * o livro sai do catálogo.
 */
export async function moderateBook(
  input: unknown,
  edit?: { fields: ManualBookFields; description: string },
): Promise<ActionResult> {
  const parsed = moderateBookSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const staff = await staffWith("moderator");
  if (!staff) return DENIED;
  const data = parsed.data;
  const admin = createAdminClient();

  let changes: Record<string, unknown> | null = null;
  if (data.action === "edit") {
    if (!edit) return { ok: false, error: "Nada mudou." };
    const fields = manualBookSchema.safeParse(edit.fields);
    if (!fields.success) return invalid(fields.error);
    const { data: current } = await admin
      .from("books")
      .select(
        "title, subtitle, authors, description, page_count, published_year, isbn_13",
      )
      .eq("id", data.bookId)
      .maybeSingle();
    if (!current) return { ok: false, error: "Livro não encontrado." };
    changes = diffFields(
      current,
      proposedFields(fields.data, edit.description.trim() || null),
    ).changes;
    if (Object.keys(changes).length === 0) {
      return { ok: false, error: "Nada mudou ainda: altere algum campo." };
    }
  }

  const shelves = await shelvesOf(admin, data.bookId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("moderate_book", {
    book: data.bookId,
    action: data.action,
    note: data.action === "delete" ? data.note : undefined,
    changes: (changes ?? undefined) as Json | undefined,
  });
  if (error) {
    return {
      ok: false,
      error: error.message.includes("isbn")
        ? "Esse ISBN já é de outro livro."
        : reviewError(error.message),
    };
  }
  const name =
    data.action === "delete"
      ? "excluir"
      : data.action === "restore"
        ? "restaurar"
        : "editar";
  try {
    await audit(admin, staff, {
      action: `livro.${name}`,
      targetType: "livro",
      targetId: data.bookId,
      after: changes,
      reason: data.action === "delete" ? data.note : null,
    });
  } catch {
    // A decisão valeu; só o registro falhou
  }
  // A estante de quem tem o livro some ou volta com ele
  refreshBooks([data.bookId], data.action === "edit" ? [] : shelves);
  return { ok: true, data: undefined };
}

/**
 * Revisa as denúncias de um alvo da comunidade: ocultar o conteúdo (e dar as
 * denúncias por resolvidas) ou dispensar. A função do banco confere o papel.
 */
export async function reviewReport(
  reportId: string,
  hide: boolean,
): Promise<ActionResult> {
  const staff = await staffWith("moderator");
  if (!staff) return DENIED;
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_report", {
    report: reportId,
    hide,
  });
  if (error) return { ok: false, error: reviewError(error.message) };
  try {
    await audit(createAdminClient(), staff, {
      action: hide ? "denuncia.ocultar" : "denuncia.dispensar",
      targetType: "denuncia",
      targetId: reportId,
    });
  } catch {
    // A decisão valeu; só o registro falhou
  }
  updateTag("forum");
  return { ok: true, data: undefined };
}

const categorySchema = z.object({
  id: z.uuid().nullable(),
  name: z
    .string()
    .trim()
    .min(2, "Um nome com pelo menos 2 letras")
    .max(40, "Até 40 letras"),
  description: z.string().trim().max(200, "Até 200 caracteres"),
  position: z.coerce.number().int().min(0).max(999),
});

/** Cria ou muda uma categoria do fórum (só o admin). */
export async function saveCategory(
  input: z.input<typeof categorySchema>,
): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const staff = await staffWith("admin");
  if (!staff) return DENIED;
  const { id, name, description, position } = parsed.data;
  const admin = createAdminClient();
  const row = { name, description: description || null, position };
  const { error } = id
    ? await admin.from("forum_categories").update(row).eq("id", id)
    : await admin
        .from("forum_categories")
        .insert({ ...row, slug: genreSlug(name) });
  if (error) {
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "Já existe uma categoria com esse nome."
          : "Não deu para salvar agora. Tente de novo.",
    };
  }
  try {
    await audit(admin, staff, {
      action: id ? "categoria.editar" : "categoria.criar",
      targetType: "categoria",
      targetId: id,
      after: row,
    });
  } catch {
    // Idem
  }
  updateTag("forum");
  return { ok: true, data: undefined };
}

/** Exclui uma categoria vazia (com tópicos, mova-os antes). */
export async function deleteCategory(id: string): Promise<ActionResult> {
  const staff = await staffWith("admin");
  if (!staff) return DENIED;
  const admin = createAdminClient();
  const { count } = await admin
    .from("forum_topics")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if ((count ?? 0) > 0) {
    return { ok: false, error: "A categoria tem tópicos: mova-os antes." };
  }
  const { error } = await admin.from("forum_categories").delete().eq("id", id);
  if (error) return FAILED;
  try {
    await audit(admin, staff, {
      action: "categoria.excluir",
      targetType: "categoria",
      targetId: id,
    });
  } catch {
    // Idem
  }
  updateTag("forum");
  return { ok: true, data: undefined };
}
