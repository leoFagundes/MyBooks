import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { avatarSrc } from "@/features/profile/lib/avatar";
import { getViewer, type Viewer } from "@/lib/auth";
import { getPublicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import {
  type FeatureFlag,
  parseSettings,
  type SiteSettings,
} from "./lib/settings";

/** As configurações do site, públicas: o aviso, a manutenção e as funcionalidades. */
export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("minutes");
  cacheTag("site-settings");
  const { data } = await createPublicClient()
    .from("site_settings")
    .select("key, value");
  return parseSettings(data ?? []);
}

/** Uma funcionalidade está ligada? (Desligar é no /admin/configuracoes.) */
export async function isFeatureOn(flag: FeatureFlag): Promise<boolean> {
  return (await getSiteSettings()).features[flag];
}

export type StaffRole = "admin" | "moderator";
export type Staff = Viewer & { role: StaffRole };

/**
 * Quem está vendo, se for da equipe. Sem cache: perder o papel vale no pedido
 * seguinte. O papel vem das funções do banco, que leem user_roles.
 */
export async function getStaff(): Promise<Staff | null> {
  // Sempre no pedido: o papel nunca vem de um pré-render
  await connection();
  const viewer = await getViewer();
  if (!viewer) return null;
  const supabase = await createClient();
  const [admin, moderator] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("is_moderator"),
  ]);
  if (admin.data === true) return { ...viewer, role: "admin" };
  if (moderator.data === true) return { ...viewer, role: "moderator" };
  return null;
}

/** Para páginas do /admin: sem o papel, 404 (o painel não se anuncia). */
export async function requireStaff(level: StaffRole = "moderator") {
  const staff = await getStaff();
  if (!staff || (level === "admin" && staff.role !== "admin")) notFound();
  return staff;
}

export type Overview = {
  users: { day: number; week: number; month: number; total: number };
  active: { week: number; month: number };
  books: { week: number; month: number; total: number };
  collections: { week: number; month: number; total: number };
  pending: { genres: number };
  growth: { week: string; users: number }[];
};

export async function getOverview(): Promise<Overview> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_overview");
  if (error) throw error;
  return data as unknown as Overview;
}

export const USER_FILTERS = ["suspensos", "banidos", "moderadores"] as const;
export type UserFilter = (typeof USER_FILTERS)[number];
export const USER_SORTS = ["created_at", "username", "books"] as const;
export type UserSort = (typeof USER_SORTS)[number];

export type AdminUserRow = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  createdAt: string;
  books: number;
  role: StaffRole | null;
  sanction: "suspension" | "ban" | null;
  sanctionEndsAt: string | null;
};

export type UsersPage = { rows: AdminUserRow[]; total: number };

/** Uma página da lista de usuários: busca, filtro e ordem no banco. */
export async function getUsersPage({
  q,
  filter,
  sort,
  direction,
  page,
  size,
}: {
  q: string;
  filter: UserFilter | null;
  sort: UserSort;
  direction: "asc" | "desc";
  page: number;
  size: number;
}): Promise<UsersPage> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_users", {
    q,
    status_filter: filter ?? undefined,
    sort,
    direction,
    page,
    page_size: size,
  });
  if (error) throw error;
  const base = getPublicEnv().supabaseUrl;
  return {
    total: Number(data[0]?.total ?? 0),
    rows: data.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name?.trim() || row.username,
      avatarUrl: avatarSrc(row.avatar_url, base),
      email: row.email,
      createdAt: row.created_at,
      books: Number(row.books),
      role: row.role === "admin" || row.role === "moderator" ? row.role : null,
      sanction:
        row.sanction === "suspension" || row.sanction === "ban"
          ? row.sanction
          : null,
      sanctionEndsAt: row.sanction_ends_at,
    })),
  };
}

export type SanctionItem = {
  id: string;
  kind: "suspension" | "ban";
  reason: string;
  endsAt: string | null;
  createdAt: string;
  liftedAt: string | null;
  by: string | null;
};

export type UserSummary = AdminUserRow & {
  bio: string | null;
  isPrivate: boolean;
  counts: { quotes: number; reviews: number; collections: number };
  sanctions: SanctionItem[];
};

/**
 * O perfil resumido de alguém no painel. Com a chave secreta: só depois de
 * conferir o papel de quem pede (requireStaff na rota).
 */
export async function getUserSummary(id: string): Promise<UserSummary | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, bio, is_private, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!profile) return null;
  const [user, books, reviews, quotes, collections, roles, sanctions] =
    await Promise.all([
      admin.auth.admin.getUserById(id),
      admin
        .from("user_books")
        .select("*", { count: "exact", head: true })
        .eq("user_id", id),
      admin
        .from("user_books")
        .select("*", { count: "exact", head: true })
        .eq("user_id", id)
        .not("review", "is", null),
      admin
        .from("quotes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", id),
      admin
        .from("collections")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", id),
      admin.from("user_roles").select("role").eq("user_id", id),
      admin
        .from("account_sanctions")
        .select(
          "id, kind, reason, ends_at, created_at, lifted_at, author:profiles!account_sanctions_created_by_fkey(username)",
        )
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
  const roleNames = (roles.data ?? []).map((row) => row.role);
  const history: SanctionItem[] = (sanctions.data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind === "ban" ? "ban" : "suspension",
    reason: row.reason,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    liftedAt: row.lifted_at,
    by: row.author?.username ?? null,
  }));
  const now = Date.now();
  const current = history.find(
    (item) =>
      !item.liftedAt && (!item.endsAt || new Date(item.endsAt).getTime() > now),
  );
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name?.trim() || profile.username,
    avatarUrl: avatarSrc(profile.avatar_url, getPublicEnv().supabaseUrl),
    email: user.data.user?.email ?? null,
    createdAt: profile.created_at,
    books: books.count ?? 0,
    role: roleNames.includes("admin")
      ? "admin"
      : roleNames.includes("moderator")
        ? "moderator"
        : null,
    sanction: current?.kind ?? null,
    sanctionEndsAt: current?.endsAt ?? null,
    bio: profile.bio,
    isPrivate: profile.is_private,
    counts: {
      quotes: quotes.count ?? 0,
      reviews: reviews.count ?? 0,
      collections: collections.count ?? 0,
    },
    sanctions: history,
  };
}

export type AuditRow = {
  id: string;
  actor: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  createdAt: string;
};

/** Uma página da auditoria, da mais nova à mais antiga (a RLS: só admin lê). */
export async function getAuditPage({
  action,
  page,
  size,
}: {
  action: string | null;
  page: number;
  size: number;
}): Promise<{ rows: AuditRow[]; total: number }> {
  const supabase = await createClient();
  let request = supabase
    .from("admin_audit_log")
    .select(
      "id, action, target_type, target_id, before, after, reason, created_at, actor:profiles!admin_audit_log_actor_id_fkey(username)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(page * size, page * size + size - 1);
  if (action) request = request.eq("action", action);
  const { data, count, error } = await request;
  if (error) throw error;
  return {
    total: count ?? 0,
    rows: data.map((row) => ({
      id: row.id,
      actor: row.actor?.username ?? null,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      before: row.before,
      after: row.after,
      reason: row.reason,
      createdAt: row.created_at,
    })),
  };
}
