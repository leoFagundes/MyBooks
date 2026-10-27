import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { toBookVisual } from "@/features/books/lib/to-book-visual";
import { avatarSrc } from "@/features/profile/lib/avatar";
import { getViewer } from "@/lib/auth";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { byPosition } from "./lib/position";
import type { CollectionItemVisual, CollectionVisual, Person } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_COVERS = 5;

type PersonRow = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export function toPerson(row: PersonRow): Person {
  return {
    username: row.username,
    displayName: row.display_name?.trim() || row.username,
    avatarUrl: avatarSrc(row.avatar_url, getPublicEnv().supabaseUrl),
  };
}

/** O que quem está vendo pode fazer na coleção. */
export type CollectionViewerState = {
  signedIn: boolean;
  isOwner: boolean;
  isMember: boolean;
  /** A dona sempre; membros, enquanto a coleção for colaborativa. */
  canEdit: boolean;
  liked: boolean;
  saved: boolean;
};

export type CollectionPageData = {
  collection: CollectionVisual;
  /** Na ordem da coleção. */
  items: CollectionItemVisual[];
  viewer: CollectionViewerState;
};

/**
 * A coleção com os livros, os colaboradores e o que quem vê pode fazer. Lê
 * com a sessão: a RLS decide quem vê (privada, só a dona e os membros), e a
 * origem de uma cópia só vem se ainda for visível. Null quando não existe
 * ou não é para quem está vendo.
 */
export async function getCollection(
  id: string,
): Promise<CollectionPageData | null> {
  "use cache: private";
  cacheLife("minutes");
  cacheTag(`collection:${id}`);
  if (!UUID.test(id)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .select(
      "id, title, emoji, description, visibility, is_collaborative, owner_id, copied_from_id, owner:profiles!collections_owner_id_fkey(username, display_name, avatar_url), copied_from_owner:profiles!collections_copied_from_owner_id_fkey(username), collection_members(user_id, created_at, profile:profiles(username, display_name, avatar_url)), collection_items(position, note, book:books(id, title, authors, cover_url, cover_color, page_count, published_year)), collection_likes(count)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data?.owner) return null;
  cacheTag(`profile:${data.owner.username}`);

  const items = data.collection_items
    .flatMap(({ position, note, book }) =>
      book ? [{ book: toBookVisual(book), position, note }] : [],
    )
    .sort(byPosition((item) => item.book.id));
  const members = [...data.collection_members]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .flatMap((member) => (member.profile ? [member] : []));

  const viewer = await getViewer();
  const isOwner = viewer?.id === data.owner_id;
  const isMember = members.some((member) => member.user_id === viewer?.id);
  const [source, like, save] = await Promise.all([
    // A origem da cópia só vem se quem vê ainda puder vê-la (RLS)
    data.copied_from_id
      ? supabase
          .from("collections")
          .select("id, title")
          .eq("id", data.copied_from_id)
          .maybeSingle()
      : null,
    viewer
      ? supabase
          .from("collection_likes")
          .select("user_id")
          .eq("collection_id", id)
          .eq("user_id", viewer.id)
          .maybeSingle()
      : null,
    viewer
      ? supabase
          .from("collection_saves")
          .select("user_id")
          .eq("collection_id", id)
          .eq("user_id", viewer.id)
          .maybeSingle()
      : null,
  ]);

  return {
    collection: {
      id: data.id,
      title: data.title,
      emoji: data.emoji,
      description: data.description,
      visibility: data.visibility === "private" ? "private" : "public",
      isCollaborative: data.is_collaborative,
      owner: toPerson(data.owner),
      members: members.flatMap(({ profile }) =>
        profile ? [toPerson(profile)] : [],
      ),
      copiedFrom: data.copied_from_owner
        ? {
            username: data.copied_from_owner.username,
            collection: source?.data ?? null,
          }
        : null,
      bookCount: items.length,
      likeCount: data.collection_likes[0]?.count ?? 0,
      covers: items.slice(0, MAX_COVERS).map((item) => item.book),
    },
    items,
    viewer: {
      signedIn: viewer !== null,
      isOwner,
      isMember,
      canEdit: isOwner || (data.is_collaborative && isMember),
      liked: Boolean(like?.data),
      saved: Boolean(save?.data),
    },
  };
}
