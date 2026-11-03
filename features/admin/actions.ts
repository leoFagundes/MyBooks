"use server";

import { updateTag } from "next/cache";
import type { z } from "zod";
import type { ActionResult } from "@/lib/action";
import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaff, type Staff, type StaffRole } from "./queries";
import {
  bannerSchema,
  featuresSchema,
  liftSanctionSchema,
  maintenanceSchema,
  moderatorSchema,
  removeContentSchema,
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
