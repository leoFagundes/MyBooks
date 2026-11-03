import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { toBookVisual } from "@/features/books/lib/to-book-visual";
import type { BookVisual } from "@/features/books/types";
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
  pending: { genres: number; books: number; requests: number; reports: number };
  growth: { week: string; users: number }[];
};

export async function getOverview(): Promise<Overview> {
  const supabase = await createClient();
  const [{ data, error }, reports] = await Promise.all([
    supabase.rpc("admin_overview"),
    // As denúncias da comunidade (a RLS deixa a equipe ver todas)
    supabase
      .from("content_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);
  if (error) throw error;
  const overview = data as unknown as Overview;
  return {
    ...overview,
    pending: { ...overview.pending, reports: reports.count ?? 0 },
  };
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

export type PendingBook = {
  id: string;
  visual: BookVisual;
  subtitle: string | null;
  description: string | null;
  isbn13: string | null;
  creator: string | null;
  createdAt: string;
  /** Em quantas estantes ele já está (todas, inclusive as privadas). */
  shelves: number;
};

export type PendingRequest = {
  id: string;
  type: "edit" | "delete" | "merge";
  reason: string;
  createdAt: string;
  requester: string | null;
  book: { id: string; title: string; current: Record<string, unknown> };
  changes: Record<string, unknown>;
  base: Record<string, unknown>;
  target: { id: string; title: string } | null;
};

export type PendingGenre = {
  slug: string;
  name: string;
  creator: string | null;
  createdAt: string;
  favorites: number;
};

export type ModerationQueues = {
  books: PendingBook[];
  requests: PendingRequest[];
  genres: PendingGenre[];
  reports: PendingReport[];
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/**
 * As três filas da moderação (MELHORIAS 7): os livros manuais novos, as
 * sugestões de edição, exclusão e mescla, e os gêneros criados por leitores.
 * Com a chave secreta (o gênero pendente só quem criou vê pela RLS): só depois
 * de conferir o papel (requireStaff na rota).
 */
export async function getModerationQueues(): Promise<ModerationQueues> {
  const admin = createAdminClient();
  const [books, requests, genres] = await Promise.all([
    admin
      .from("books")
      .select(
        "id, title, subtitle, authors, description, page_count, published_year, isbn_13, cover_url, cover_color, cover_style, created_at, creator:profiles!books_created_by_fkey(username)",
      )
      .eq("moderation_status", "pending")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(50),
    admin
      .from("book_change_requests")
      .select(
        "id, type, reason, changes, base_snapshot, created_at, requester:profiles!book_change_requests_user_id_fkey(username), book:books!book_change_requests_book_id_fkey(id, title, subtitle, authors, description, page_count, published_year, isbn_13), target:books!book_change_requests_target_book_id_fkey(id, title)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50),
    admin
      .from("genres")
      .select(
        "id, slug, name, created_at, creator:profiles!genres_created_by_fkey(username)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(50),
  ]);
  if (books.error) throw books.error;
  if (requests.error) throw requests.error;
  if (genres.error) throw genres.error;

  const bookIds = books.data.map((book) => book.id);
  const genreIds = genres.data.map((genre) => genre.id);
  const [shelves, favorites] = await Promise.all([
    bookIds.length > 0
      ? admin.from("user_books").select("book_id").in("book_id", bookIds)
      : Promise.resolve({ data: [] as { book_id: string }[] }),
    genreIds.length > 0
      ? admin
          .from("user_favorite_genres")
          .select("genre_id")
          .in("genre_id", genreIds)
      : Promise.resolve({ data: [] as { genre_id: string }[] }),
  ]);
  const count = <T>(rows: T[] | null, key: (row: T) => string) => {
    const counts = new Map<string, number>();
    for (const row of rows ?? []) {
      counts.set(key(row), (counts.get(key(row)) ?? 0) + 1);
    }
    return counts;
  };
  const shelfCounts = count(shelves.data, (row) => row.book_id);
  const favoriteCounts = count(favorites.data, (row) => row.genre_id);

  const reports = await getPendingReports();
  return {
    reports,
    books: books.data.map((book) => ({
      id: book.id,
      visual: toBookVisual(book),
      subtitle: book.subtitle,
      description: book.description,
      isbn13: book.isbn_13,
      creator: book.creator?.username ?? null,
      createdAt: book.created_at,
      shelves: shelfCounts.get(book.id) ?? 0,
    })),
    requests: requests.data.flatMap((request) => {
      if (!request.book) return [];
      const { id, title, ...current } = request.book;
      const type =
        request.type === "delete" || request.type === "merge"
          ? request.type
          : "edit";
      return [
        {
          id: request.id,
          type,
          reason: request.reason,
          createdAt: request.created_at,
          requester: request.requester?.username ?? null,
          book: { id, title, current: { title, ...current } },
          changes: record(request.changes),
          base: record(request.base_snapshot),
          target: request.target
            ? { id: request.target.id, title: request.target.title }
            : null,
        },
      ];
    }),
    genres: genres.data.map((genre) => ({
      slug: genre.slug,
      name: genre.name,
      creator: genre.creator?.username ?? null,
      createdAt: genre.created_at,
      favorites: favoriteCounts.get(genre.id) ?? 0,
    })),
  };
}

export const BOOK_FILTERS = ["pendentes", "rejeitados", "excluidos"] as const;
export type BookFilter = (typeof BOOK_FILTERS)[number];
export const BOOK_SORTS = ["created_at", "title", "shelves"] as const;
export type BookSort = (typeof BOOK_SORTS)[number];

export type AdminBookRow = {
  visual: BookVisual;
  source: "manual" | "google" | "openlibrary";
  status: "pending" | "approved" | "rejected";
  note: string | null;
  deletedAt: string | null;
  mergedInto: { id: string; title: string } | null;
  creator: string | null;
  createdAt: string;
  shelves: number;
};

/**
 * Uma página dos livros do painel: os que não vieram da Open Library
 * (cadastrados à mão e do Google Books) e, no filtro, os excluídos.
 */
export async function getBooksPage({
  q,
  filter,
  sort,
  direction,
  page,
  size,
}: {
  q: string;
  filter: BookFilter | null;
  sort: BookSort;
  direction: "asc" | "desc";
  page: number;
  size: number;
}): Promise<{ rows: AdminBookRow[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_books", {
    q,
    status_filter: filter ?? undefined,
    sort,
    direction,
    page,
    page_size: size,
  });
  if (error) throw error;
  return {
    total: Number(data[0]?.total ?? 0),
    rows: data.map((row) => ({
      visual: toBookVisual(row),
      source:
        row.source === "manual" || row.source === "google"
          ? row.source
          : "openlibrary",
      status:
        row.moderation_status === "pending" ||
        row.moderation_status === "rejected"
          ? row.moderation_status
          : "approved",
      note: row.moderation_note,
      deletedAt: row.deleted_at,
      mergedInto:
        row.merged_into && row.merged_title
          ? { id: row.merged_into, title: row.merged_title }
          : null,
      creator: row.creator,
      createdAt: row.created_at,
      shelves: Number(row.shelves),
    })),
  };
}

export type AdminBookDetails = {
  id: string;
  subtitle: string | null;
  description: string | null;
  isbn13: string | null;
};

/** Os campos que a edição do painel preenche (chave secreta: só depois do papel). */
export async function getAdminBookDetails(
  id: string,
): Promise<AdminBookDetails | null> {
  const { data } = await createAdminClient()
    .from("books")
    .select("id, subtitle, description, isbn_13")
    .eq("id", id)
    .maybeSingle();
  return data
    ? {
        id: data.id,
        subtitle: data.subtitle,
        description: data.description,
        isbn13: data.isbn_13,
      }
    : null;
}

export type PendingReport = {
  /** A denúncia mais antiga do alvo (as outras vão junto na revisão). */
  id: string;
  targetType: "topic" | "reply" | "suggestion" | "suggestion_comment";
  targetId: string;
  /** Para onde levar: o tópico ou a sugestão. */
  href: string | null;
  title: string;
  excerpt: string;
  author: string | null;
  reasons: { reason: string; count: number }[];
  details: string[];
  count: number;
  createdAt: string;
};

/**
 * A fila de denúncias da comunidade (MELHORIAS 8), agrupada por alvo: o que
 * foi denunciado, por quais motivos e quantas vezes. Com a chave secreta,
 * depois do papel (o alvo pode estar oculto).
 */
export async function getPendingReports(): Promise<PendingReport[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("content_reports")
    .select("id, target_type, target_id, reason, details, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(300);
  if (error) throw error;
  const groups = new Map<string, typeof data>();
  for (const row of data) {
    const key = `${row.target_type}:${row.target_id}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const ids = (type: string) =>
    [...groups.values()]
      .filter((rows) => rows[0]?.target_type === type)
      .map((rows) => rows[0]?.target_id as string);
  const [topics, replies, suggestions, comments] = await Promise.all([
    ids("topic").length
      ? admin
          .from("forum_topics")
          .select(
            "id, title, body, author:profiles!forum_topics_author_id_fkey(username)",
          )
          .in("id", ids("topic"))
      : Promise.resolve({ data: [] }),
    ids("reply").length
      ? admin
          .from("forum_replies")
          .select(
            "id, topic_id, body, author:profiles!forum_replies_author_id_fkey(username), topic:forum_topics!forum_replies_topic_id_fkey(title)",
          )
          .in("id", ids("reply"))
      : Promise.resolve({ data: [] }),
    ids("suggestion").length
      ? admin
          .from("feature_suggestions")
          .select(
            "id, title, body, author:profiles!feature_suggestions_author_id_fkey(username)",
          )
          .in("id", ids("suggestion"))
      : Promise.resolve({ data: [] }),
    ids("suggestion_comment").length
      ? admin
          .from("suggestion_comments")
          .select(
            "id, suggestion_id, body, author:profiles!suggestion_comments_author_id_fkey(username), suggestion:feature_suggestions!suggestion_comments_suggestion_id_fkey(title)",
          )
          .in("id", ids("suggestion_comment"))
      : Promise.resolve({ data: [] }),
  ]);
  type Target = {
    title: string;
    body: string;
    author: string | null;
    href: string | null;
  };
  const targets = new Map<string, Target>();
  for (const row of topics.data ?? []) {
    targets.set(`topic:${row.id}`, {
      title: row.title,
      body: row.body,
      author: row.author?.username ?? null,
      href: `/comunidade/${row.id}`,
    });
  }
  for (const row of replies.data ?? []) {
    targets.set(`reply:${row.id}`, {
      title: `Resposta em ${row.topic?.title ?? "um tópico"}`,
      body: row.body,
      author: row.author?.username ?? null,
      href: `/comunidade/${row.topic_id}`,
    });
  }
  for (const row of suggestions.data ?? []) {
    targets.set(`suggestion:${row.id}`, {
      title: row.title,
      body: row.body,
      author: row.author?.username ?? null,
      href: `/sugestoes/${row.id}`,
    });
  }
  for (const row of comments.data ?? []) {
    targets.set(`suggestion_comment:${row.id}`, {
      title: `Comentário em ${row.suggestion?.title ?? "uma sugestão"}`,
      body: row.body,
      author: row.author?.username ?? null,
      href: `/sugestoes/${row.suggestion_id}`,
    });
  }
  return [...groups.entries()].flatMap(([key, rows]) => {
    const first = rows[0];
    const target = targets.get(key);
    if (!first) return [];
    const reasons = new Map<string, number>();
    for (const row of rows)
      reasons.set(row.reason, (reasons.get(row.reason) ?? 0) + 1);
    const text = target ? target.body.replace(/\s+/g, " ").trim() : "";
    return [
      {
        id: first.id,
        targetType: first.target_type as PendingReport["targetType"],
        targetId: first.target_id,
        href: target?.href ?? null,
        title: target?.title ?? "Conteúdo excluído",
        excerpt: text.length > 280 ? `${text.slice(0, 279)}…` : text,
        author: target?.author ?? null,
        reasons: [...reasons].map(([reason, count]) => ({ reason, count })),
        details: rows.flatMap((row) => (row.details ? [row.details] : [])),
        count: rows.length,
        createdAt: first.created_at,
      },
    ];
  });
}

export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  position: number;
  topics: number;
};

/** As categorias do fórum, com quantos tópicos cada uma tem (o painel). */
export async function getAdminCategories(): Promise<AdminCategory[]> {
  const admin = createAdminClient();
  const [{ data: categories }, { data: topics }] = await Promise.all([
    admin
      .from("forum_categories")
      .select("id, slug, name, description, position")
      .order("position")
      .order("name"),
    admin.from("forum_topics").select("category_id").is("deleted_at", null),
  ]);
  const counts = new Map<string, number>();
  for (const row of topics ?? [])
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  return (categories ?? []).map((category) => ({
    ...category,
    topics: counts.get(category.id) ?? 0,
  }));
}
