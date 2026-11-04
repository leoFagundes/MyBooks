import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { toBookVisual } from "@/features/books/lib/to-book-visual";
import type { BookVisual } from "@/features/books/types";
import { getViewer } from "@/lib/auth";
import { getPublicEnv } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { genreLabel } from "./genres";
import { avatarSrc } from "./lib/avatar";
import type { Genre } from "./lib/genre-name";

export type OwnProfile = {
  id: string;
  username: string;
  /** Vazio quando a pessoa ainda não disse o nome (o cadastro por e-mail). */
  displayName: string;
  avatarUrl: string | null;
  /** Os favoritos com nome, inclusive os gêneros criados e ainda pendentes. */
  favoriteGenres: Genre[];
};

type FavoriteRow = {
  position: number;
  genre: { slug: string; name: string; status: string } | null;
};

const favoritesFrom = (rows: FavoriteRow[]): Genre[] =>
  [...rows]
    .sort((a, b) => a.position - b.position)
    .flatMap(({ genre }) =>
      genre
        ? [
            {
              slug: genre.slug,
              name: genre.name,
              pending: genre.status !== "approved",
            },
          ]
        : [],
    );

const FAVORITES =
  "user_favorite_genres(position, genre:genres(slug, name, status))";

/** O perfil de quem está vendo, como o onboarding precisa. */
export async function getOwnProfile(
  userId: string,
): Promise<OwnProfile | null> {
  "use cache: private";
  cacheLife("minutes");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(`username, display_name, avatar_url, ${FAVORITES}`)
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;

  cacheTag(`profile:${data.username}`);
  return {
    id: userId,
    username: data.username,
    displayName: data.display_name ?? "",
    avatarUrl: avatarSrc(data.avatar_url, getPublicEnv().supabaseUrl),
    favoriteGenres: favoritesFrom(data.user_favorite_genres),
  };
}

/**
 * Os gêneros favoritos de quem está vendo, com nome e na ordem dela,
 * inclusive os que ela criou e ainda esperam aprovação (Editar perfil).
 */
export async function getOwnFavoriteGenres(viewer: {
  id: string;
  username: string;
}): Promise<Genre[]> {
  "use cache: private";
  cacheLife("minutes");
  cacheTag(`profile:${viewer.username}`);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_favorite_genres")
    .select("position, genre:genres(slug, name, status)")
    .eq("user_id", viewer.id);
  if (error) throw error;
  return favoritesFrom(data);
}

/**
 * Os gêneros que quem vê pode escolher: os aprovados de todos e os que ela
 * mesma criou (a RLS decide). Sem cache: um gênero criado agora já aparece.
 */
export async function getVisibleGenres(): Promise<Genre[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("genres")
    .select("slug, name, status")
    .order("name");
  if (error) throw error;
  return data.map((genre) => ({
    slug: genre.slug,
    name: genre.name,
    pending: genre.status !== "approved",
  }));
}

/**
 * Os nomes dos gêneros de leitores (só os aprovados) entre esses slugs: os
 * oficiais têm nome no código. Serve aos favoritos do perfil e ao livro.
 */
export async function customGenreNames(
  slugs: string[],
): Promise<Record<string, string>> {
  const custom = slugs.filter((slug) => !genreLabel(slug));
  if (custom.length === 0) return {};
  const { data } = await createPublicClient()
    .from("genres")
    .select("slug, name")
    .in("slug", custom);
  return Object.fromEntries(
    (data ?? []).map((genre) => [genre.slug, genre.name]),
  );
}

const USERNAME = /^[a-z0-9_]{3,20}$/;

export type ProfileSummary = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  /** Os favoritos aprovados (slugs), na ordem da pessoa. */
  favoriteGenres: string[];
  /** O nome dos favoritos criados por leitores (os oficiais têm no código). */
  genreNames?: Record<string, string>;
  isPrivate: boolean;
};

/** O perfil pelo @: o cabeçalho, que aparece até em perfil privado. */
export async function getProfileByUsername(
  username: string,
): Promise<ProfileSummary | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`profile:${username}`);
  if (!USERNAME.test(username)) return null;

  const { data, error } = await createPublicClient()
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, bio, favorite_genres, is_private",
    )
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name?.trim() || data.username,
    avatarUrl: avatarSrc(data.avatar_url, getPublicEnv().supabaseUrl),
    bio: data.bio,
    favoriteGenres: data.favorite_genres,
    genreNames: await customGenreNames(data.favorite_genres),
    isPrivate: data.is_private,
  };
}

export type ProfileCard = ProfileSummary & {
  counts: ProfileCounts | null;
  /** Até 5 capas da estante, das mexidas por último. */
  covers: BookVisual[];
};

/**
 * O perfil como um visitante o vê, para a imagem de compartilhamento: perfil
 * privado mostra só o nome. Sem sessão, em cache.
 */
export async function getProfileCard(
  username: string,
): Promise<ProfileCard | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`profile:${username}`);
  const profile = await getProfileByUsername(username);
  if (!profile) return null;
  if (profile.isPrivate) {
    return { ...profile, bio: null, counts: null, covers: [] };
  }
  cacheTag(`shelf:${profile.id}`);
  const supabase = createPublicClient();
  const [counts, shelf] = await Promise.all([
    supabase.rpc("profile_counts", { profile_id: profile.id }).single(),
    supabase
      .from("user_books")
      .select(
        "book:books(id, title, authors, cover_url, cover_color, cover_style, page_count, published_year)",
      )
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false })
      .limit(24),
  ]);
  const books = (shelf.data ?? []).flatMap(({ book }) =>
    book ? [toBookVisual(book)] : [],
  );
  return {
    ...profile,
    counts: counts.error ? null : counts.data,
    covers: books.filter((book) => book.coverUrl).slice(0, 5),
  };
}

/** O perfil a partir do @ da URL: "/@Ana" acha a ana. */
export async function getProfileFromParam(
  param: string,
): Promise<ProfileSummary | null> {
  let username: string;
  try {
    username = decodeURIComponent(param).toLowerCase();
  } catch {
    return null;
  }
  return getProfileByUsername(username);
}

export type ProfileCounts = {
  books: number;
  collections: number;
  followers: number;
  following: number;
};

/**
 * Os contadores do cabeçalho (profile_counts, no banco). O dono conta também
 * as coleções privadas, por isso a leitura é com a sessão. Sem resposta,
 * null: o cabeçalho aparece sem eles.
 */
export async function getProfileCounts(
  profile: Pick<ProfileSummary, "id" | "username">,
): Promise<ProfileCounts | null> {
  "use cache: private";
  cacheLife("minutes");
  cacheTag(`profile:${profile.username}`, `shelf:${profile.id}`);

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("profile_counts", { profile_id: profile.id })
    .single();
  return error ? null : data;
}

/** Quem está vendo diante do perfil: o dono, quem segue, quem pediu… */
export type ProfileRelation =
  "self" | "following" | "requested" | "none" | "visitor";

export async function getProfileRelation(
  profile: Pick<ProfileSummary, "id" | "username">,
): Promise<ProfileRelation> {
  "use cache: private";
  cacheLife("minutes");
  // Seguir e deixar de seguir atualizam o perfil das duas pessoas
  cacheTag(`profile:${profile.username}`);

  const viewer = await getViewer();
  if (!viewer) return "visitor";
  if (viewer.id === profile.id) return "self";
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_id", viewer.id)
    .eq("following_id", profile.id)
    .maybeSingle();
  if (!data) return "none";
  return data.status === "accepted" ? "following" : "requested";
}

/** O perfil de uma aba e se quem está vendo pode ver o conteúdo dela. */
export async function getProfileTab(param: string) {
  const profile = await getProfileFromParam(param);
  if (!profile) return null;
  const relation = await getProfileRelation(profile);
  return { profile, relation, visible: canSeeContent(profile, relation) };
}

/** Estante, coleções e citações: de todos, ou só de quem segue (perfil privado). */
export function canSeeContent(
  profile: Pick<ProfileSummary, "isPrivate">,
  relation: ProfileRelation,
) {
  return !profile.isPrivate || relation === "self" || relation === "following";
}

/** O e-mail da conta de quem está vendo, das claims da sessão. */
export async function getAccountEmail(
  username: string,
): Promise<string | null> {
  "use cache: private";
  cacheLife("minutes");
  cacheTag(`profile:${username}`);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email;
  return typeof email === "string" && email ? email : null;
}
