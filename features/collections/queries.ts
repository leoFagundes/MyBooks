import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { toBookVisual } from "@/features/books/lib/to-book-visual";
import { avatarSrc } from "@/features/profile/lib/avatar";
import { getViewer } from "@/lib/auth";
import { getPublicEnv } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { byPosition } from "./lib/position";
import type { CollectionItemVisual, CollectionVisual, Person } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Sem livro, nenhum item embutido volta (hasBook falso em todas)
const UUID_NONE = "00000000-0000-0000-0000-000000000000";
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

// As colunas de um card: capas pela ordem, curtidas, colaboradores e crédito
const CARD_COLUMNS =
  "id, title, emoji, description, visibility, is_collaborative, owner:profiles!collections_owner_id_fkey(username, display_name, avatar_url), copied_from_owner:profiles!collections_copied_from_owner_id_fkey(username), collection_members(created_at, profile:profiles(username, display_name, avatar_url)), collection_items(position, book:books(id, title, authors, cover_url, cover_color, page_count, published_year)), collection_likes(count)";

type CardRow = {
  id: string;
  title: string;
  emoji: string | null;
  description: string | null;
  visibility: string;
  is_collaborative: boolean;
  owner: PersonRow | null;
  copied_from_owner: { username: string } | null;
  collection_members: { created_at: string; profile: PersonRow | null }[];
  collection_items: {
    position: string;
    book: Parameters<typeof toBookVisual>[0] | null;
  }[];
  collection_likes: { count: number }[];
};

function toCard(row: CardRow): CollectionVisual | null {
  if (!row.owner) return null;
  const books = row.collection_items
    .flatMap(({ position, book }) =>
      book ? [{ position, book: toBookVisual(book) }] : [],
    )
    .sort(byPosition((item) => item.book.id));
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    description: row.description,
    visibility: row.visibility === "private" ? "private" : "public",
    isCollaborative: row.is_collaborative,
    owner: toPerson(row.owner),
    members: [...row.collection_members]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .flatMap(({ profile }) => (profile ? [toPerson(profile)] : [])),
    // No card o crédito vai sem o link: a página confere se a origem é visível
    copiedFrom: row.copied_from_owner
      ? { username: row.copied_from_owner.username, collection: null }
      : null,
    bookCount: books.length,
    likeCount: row.collection_likes[0]?.count ?? 0,
    covers: books.slice(0, MAX_COVERS).map((item) => item.book),
  };
}

function cards(rows: CardRow[] | null | undefined): CollectionVisual[] {
  return (rows ?? []).flatMap((row) => {
    const card = toCard(row);
    if (!card) return [];
    // O card muda junto com a coleção (livros, título, curtidas)
    cacheTag(`collection:${card.id}`);
    return [card];
  });
}

export type ProfileCollections = {
  /** As da pessoa: as privadas só aparecem para ela e para quem colabora. */
  owned: CollectionVisual[];
  /** Em que ela colabora; só no próprio perfil. */
  member: CollectionVisual[];
  /** As que ela salvou; só no próprio perfil. */
  saved: CollectionVisual[];
};

/** A aba Coleções do perfil, conforme quem vê (a RLS esconde as privadas). */
export async function getProfileCollections(profile: {
  id: string;
  username: string;
}): Promise<ProfileCollections> {
  "use cache: private";
  cacheLife("minutes");
  cacheTag(`profile:${profile.username}`);

  const supabase = await createClient();
  const viewer = await getViewer();
  const self = viewer?.id === profile.id;
  const [owned, member, saved] = await Promise.all([
    supabase
      .from("collections")
      .select(CARD_COLUMNS)
      .eq("owner_id", profile.id)
      .order("updated_at", { ascending: false }),
    self
      ? supabase
          .from("collections")
          .select(
            `${CARD_COLUMNS}, membership:collection_members!inner(user_id)`,
          )
          .eq("membership.user_id", profile.id)
          .order("updated_at", { ascending: false })
      : null,
    self
      ? supabase
          .from("collection_saves")
          .select(`created_at, collection:collections(${CARD_COLUMNS})`)
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
      : null,
  ]);
  if (owned.error) throw owned.error;
  return {
    owned: cards(owned.data),
    member: cards(member?.data),
    saved: cards(
      saved?.data?.flatMap(({ collection }) =>
        collection ? [collection] : [],
      ),
    ),
  };
}

/** Coleção em que a pessoa pode pôr livros, e se o livro já está nela. */
export type EditableCollection = {
  id: string;
  title: string;
  emoji: string | null;
  hasBook: boolean;
};

/**
 * As coleções que alguém edita (as dela e as colaborativas em que colabora),
 * da mexida por último à mais antiga. Sem cache: o Route Handler da paleta
 * também lê por aqui.
 */
export async function readEditableCollections(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  bookId?: string,
): Promise<EditableCollection[]> {
  let owned = supabase
    .from("collections")
    .select("id, title, emoji, updated_at, collection_items(book_id)")
    .eq("owner_id", userId);
  let shared = supabase
    .from("collections")
    .select(
      "id, title, emoji, updated_at, collection_items(book_id), membership:collection_members!inner(user_id)",
    )
    .eq("membership.user_id", userId)
    .eq("is_collaborative", true);
  // Filtra os itens embutidos, não as coleções: sobra o livro, se estiver
  const book = bookId && UUID.test(bookId) ? bookId : null;
  owned = owned.eq("collection_items.book_id", book ?? UUID_NONE);
  shared = shared.eq("collection_items.book_id", book ?? UUID_NONE);
  const [mine, theirs] = await Promise.all([owned, shared]);
  if (mine.error) throw mine.error;
  if (theirs.error) throw theirs.error;
  return [...mine.data, ...theirs.data]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((row) => ({
      id: row.id,
      title: row.title,
      emoji: row.emoji,
      hasBook: row.collection_items.length > 0,
    }));
}

/** Para a página do livro: as coleções que quem vê edita, marcando o livro. */
export async function getEditableCollections(
  bookId: string,
): Promise<EditableCollection[]> {
  "use cache: private";
  cacheLife("minutes");
  const viewer = await getViewer();
  if (!viewer) return [];
  cacheTag(`profile:${viewer.username}`, `book:${bookId}`);
  const supabase = await createClient();
  const collections = await readEditableCollections(
    supabase,
    viewer.id,
    bookId,
  );
  for (const collection of collections) cacheTag(`collection:${collection.id}`);
  return collections;
}

/**
 * Coleções populares (Explorar e o Início vazio): as públicas com livros,
 * da mais curtida à menos (popular_collections, no banco). Sem sessão.
 */
export async function getPopularCollections(
  limit = 8,
): Promise<CollectionVisual[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("explore");

  const { data, error } = await createPublicClient()
    .rpc("popular_collections", { max_results: limit })
    .select(CARD_COLUMNS);
  if (error) throw error;
  // A ordem do banco pode não sobreviver aos embutidos
  return cards(data as CardRow[]).sort((a, b) => b.likeCount - a.likeCount);
}

/**
 * A coleção como um visitante a vê, para a imagem de compartilhamento: só
 * pública (a privada some, e a imagem fica genérica). Sem sessão, em cache.
 */
export async function getCollectionCard(
  id: string,
): Promise<CollectionVisual | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(`collection:${id}`);
  if (!UUID.test(id)) return null;

  const { data, error } = await createPublicClient()
    .from("collections")
    .select(CARD_COLUMNS)
    .eq("id", id)
    .eq("visibility", "public")
    .maybeSingle();
  if (error) throw error;
  return data ? (cards([data as CardRow])[0] ?? null) : null;
}

/** Busca de coleções públicas (Explorar): full-text e trigramas no banco. */
export async function searchCollections(
  query: string,
): Promise<CollectionVisual[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("explore");

  const { data, error } = await createPublicClient()
    .rpc("search_collections", { q: query, max_results: 20 })
    .select(CARD_COLUMNS);
  if (error) throw error;
  return cards(data as CardRow[]);
}
