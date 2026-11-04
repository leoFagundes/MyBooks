import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { toBookVisual } from "@/features/books/lib/to-book-visual";
import type { BookVisual } from "@/features/books/types";
import { toReader } from "@/features/social/queries";
import { getViewer } from "@/lib/auth";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { bookIdsIn, plainText } from "./lib/markdown";
import type {
  ForumCategory,
  ForumReply,
  ReactionKind,
  TopicDetail,
  TopicSort,
  TopicSummary,
  TopicsPage,
} from "./types";

export const TOPICS_PAGE = 20;
const BOOK =
  "id, title, authors, cover_url, cover_color, cover_style, page_count, published_year";
const PERSON = "id, username, display_name, avatar_url";
const TOPIC = `id, title, body, tags, contains_spoilers, pinned, locked, hidden_at, reply_count, like_count, useful_count, last_activity_at, created_at, category:forum_categories!forum_topics_category_id_fkey(slug, name), author:profiles!forum_topics_author_id_fkey(${PERSON}), books:forum_topic_books(book:books(${BOOK}))`;

const EXCERPT = 180;

/** As categorias do fórum, na ordem do painel. */
export async function getForumCategories(): Promise<ForumCategory[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("forum");
  const { data, error } = await createPublicClient()
    .from("forum_categories")
    .select("id, slug, name, description")
    .order("position")
    .order("name");
  if (error) throw error;
  return data;
}

type TopicRow = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  contains_spoilers: boolean;
  pinned: boolean;
  locked: boolean;
  hidden_at: string | null;
  reply_count: number;
  like_count: number;
  useful_count: number;
  last_activity_at: string;
  created_at: string;
  category: { slug: string; name: string } | null;
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  books: { book: Parameters<typeof toBookVisual>[0] | null }[];
};

function toSummary(row: TopicRow): TopicSummary {
  const text = plainText(row.body);
  return {
    id: row.id,
    title: row.title,
    // Tópico com spoilers não mostra o começo do texto na lista
    excerpt: row.contains_spoilers
      ? ""
      : text.length > EXCERPT
        ? `${text.slice(0, EXCERPT - 1).trimEnd()}…`
        : text,
    category: row.category ?? { slug: "geral", name: "Geral" },
    author: row.author ? toReader(row.author) : null,
    tags: row.tags,
    containsSpoilers: row.contains_spoilers,
    pinned: row.pinned,
    locked: row.locked,
    hidden: row.hidden_at !== null,
    replyCount: row.reply_count,
    likeCount: row.like_count,
    usefulCount: row.useful_count,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    books: row.books.flatMap(({ book }) => (book ? [toBookVisual(book)] : [])),
  };
}

/**
 * Uma página da lista do fórum: atividade recente (os fixados primeiro),
 * populares (curtidas, depois respostas) ou sem resposta, numa categoria ou
 * em todas. Pública e em cache: publicar atualiza a tag forum.
 */
export async function getTopics({
  category,
  sort,
  page,
}: {
  category: string | null;
  sort: TopicSort;
  page: number;
}): Promise<TopicsPage> {
  "use cache";
  cacheLife("minutes");
  cacheTag("forum");
  const supabase = createPublicClient();
  let request = supabase.from("forum_topics").select(TOPIC);
  if (category) {
    const { data } = await supabase
      .from("forum_categories")
      .select("id")
      .eq("slug", category)
      .maybeSingle();
    if (!data) return { topics: [], next: null };
    request = request.eq("category_id", data.id);
  }
  if (sort === "sem-resposta") {
    request = request
      .eq("reply_count", 0)
      .order("created_at", { ascending: false });
  } else if (sort === "populares") {
    request = request
      .order("like_count", { ascending: false })
      .order("reply_count", { ascending: false })
      .order("last_activity_at", { ascending: false });
  } else {
    request = request
      .order("pinned", { ascending: false })
      .order("last_activity_at", { ascending: false });
  }
  const from = page * TOPICS_PAGE;
  const { data, error } = await request.range(from, from + TOPICS_PAGE);
  if (error) throw error;
  const rows = data as unknown as TopicRow[];
  return {
    topics: rows.slice(0, TOPICS_PAGE).map(toSummary),
    next: rows.length > TOPICS_PAGE ? page + 1 : null,
  };
}

/** As discussões ligadas a um livro (a seção da página do livro). */
export async function getBookDiscussions(
  bookId: string,
): Promise<TopicSummary[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("forum", `book:${bookId}`);
  const supabase = createPublicClient();
  const { data: links, error } = await supabase
    .from("forum_topic_books")
    .select("topic_id")
    .eq("book_id", bookId)
    .limit(50);
  if (error) throw error;
  const ids = links.map((link) => link.topic_id);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("forum_topics")
    .select(TOPIC)
    .in("id", ids)
    .order("last_activity_at", { ascending: false })
    .limit(5);
  return ((data ?? []) as unknown as TopicRow[]).map(toSummary);
}

type ReactionRow = {
  kind: string;
  user_id: string;
  topic_id: string | null;
  reply_id: string | null;
};

function reactionsOf(
  likes: number,
  useful: number,
  rows: ReactionRow[],
  viewerId: string | null,
) {
  return {
    like: likes,
    useful,
    mine: viewerId
      ? rows
          .filter((row) => row.user_id === viewerId)
          .map((row) => row.kind as ReactionKind)
      : [],
  };
}

/**
 * Um tópico com as respostas, como quem vê o enxerga: o oculto só para o
 * autor e a equipe (a RLS decide), com as reações e se segue o tópico.
 */
export async function getTopic(id: string): Promise<TopicDetail | null> {
  await connection();
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const viewer = await getViewer();
  const { data: row } = await supabase
    .from("forum_topics")
    .select(`${TOPIC}, category_id, edited_at`)
    .eq("id", id)
    .maybeSingle();
  if (!row) return null;
  const topic = row as unknown as TopicRow & {
    category_id: string;
    edited_at: string | null;
  };

  const [replies, reactions, subscription, staff] = await Promise.all([
    supabase
      .from("forum_replies")
      .select(
        `id, parent_id, quoted_reply_id, body, like_count, useful_count, hidden_at, edited_at, deleted_at, created_at, author:profiles!forum_replies_author_id_fkey(${PERSON})`,
      )
      .eq("topic_id", id)
      .order("created_at", { ascending: true })
      .limit(500),
    viewer
      ? supabase
          .from("forum_reactions")
          .select("kind, user_id, topic_id, reply_id")
          .eq("user_id", viewer.id)
      : Promise.resolve({ data: [] as ReactionRow[] }),
    viewer
      ? supabase
          .from("forum_subscriptions")
          .select("topic_id")
          .eq("topic_id", id)
          .eq("user_id", viewer.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    viewer ? supabase.rpc("is_moderator") : Promise.resolve({ data: false }),
  ]);
  const mine = (reactions.data ?? []) as ReactionRow[];
  const replyRows = replies.data ?? [];
  const byId = new Map(replyRows.map((reply) => [reply.id, reply]));

  // Os livros citados no texto e nas respostas, de uma vez
  const cited = bookIdsIn(
    [topic.body, ...replyRows.map((reply) => reply.body)].join("\n"),
  );
  const bookMap: Record<string, BookVisual> = {};
  for (const { book } of topic.books)
    if (book) bookMap[book.id] = toBookVisual(book);
  const missing = cited.filter((bookId) => !bookMap[bookId]);
  if (missing.length > 0) {
    const { data: books } = await supabase
      .from("books")
      .select(BOOK)
      .in("id", missing);
    for (const book of books ?? []) bookMap[book.id] = toBookVisual(book);
  }

  const summary = toSummary(topic);
  const items: ForumReply[] = replyRows.map((reply) => {
    const quoted = reply.quoted_reply_id
      ? byId.get(reply.quoted_reply_id)
      : null;
    const deleted = reply.deleted_at !== null;
    return {
      id: reply.id,
      parentId: reply.parent_id,
      quoted:
        quoted && !quoted.deleted_at
          ? {
              id: quoted.id,
              author: quoted.author?.username ?? null,
              excerpt: plainText(quoted.body).slice(0, 200),
            }
          : null,
      body: deleted ? "" : reply.body,
      author: deleted || !reply.author ? null : toReader(reply.author),
      reactions: reactionsOf(
        reply.like_count,
        reply.useful_count,
        mine.filter((item) => item.reply_id === reply.id),
        viewer?.id ?? null,
      ),
      editedAt: reply.edited_at,
      deleted,
      hidden: reply.hidden_at !== null,
      createdAt: reply.created_at,
    };
  });

  return {
    ...summary,
    body: topic.body,
    categoryId: topic.category_id,
    editedAt: topic.edited_at,
    reactions: reactionsOf(
      topic.like_count,
      topic.useful_count,
      mine.filter((item) => item.topic_id === id),
      viewer?.id ?? null,
    ),
    replies: items,
    bookMap,
    subscribed: Boolean(subscription.data),
    viewer: viewer
      ? {
          id: viewer.id,
          isAuthor: viewer.id === topic.author?.id,
          staff: staff.data === true,
        }
      : null,
  };
}

/** O título do tópico para o <title> (público; oculto ou excluído não tem). */
export async function getTopicTitle(id: string): Promise<string | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("forum");
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await createPublicClient()
    .from("forum_topics")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  return data?.title ?? null;
}

/** Uma conversa do Início: o tópico e o motivo de ele aparecer. */
export type ShelfConversation = {
  topic: TopicSummary;
  /** O livro da estante de quem vê de que o tópico fala, se houver. */
  book: BookVisual | null;
  /** A pessoa segue o tópico (abriu, respondeu ou pediu para seguir). */
  following: boolean;
};

/**
 * As conversas do Início: os tópicos sobre os livros da estante de quem vê e
 * os que ela segue, do mais movimentado ao menos. Tópico sem resposta, aberto
 * por ela mesma, não conta (não há conversa para ver).
 */
export async function getShelfConversations(
  viewerId: string,
  bookIds: string[],
  limit = 4,
): Promise<ShelfConversation[]> {
  "use cache: private";
  cacheLife("minutes");
  cacheTag("forum", `shelf:${viewerId}`);

  const supabase = await createClient();
  const [links, subscriptions] = await Promise.all([
    bookIds.length > 0
      ? supabase
          .from("forum_topic_books")
          .select("topic_id")
          .in("book_id", bookIds.slice(0, 200))
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("forum_subscriptions")
      .select("topic_id")
      .eq("user_id", viewerId)
      .limit(100),
  ]);
  if (links.error) throw links.error;
  if (subscriptions.error) throw subscriptions.error;
  const following = new Set(subscriptions.data.map((row) => row.topic_id));
  const ids = [
    ...new Set([...links.data.map((row) => row.topic_id), ...following]),
  ];
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("forum_topics")
    .select(TOPIC)
    .in("id", ids)
    .is("hidden_at", null)
    .order("last_activity_at", { ascending: false })
    .limit(limit * 3);
  if (error) throw error;
  const mine = new Set(bookIds);
  return ((data ?? []) as unknown as TopicRow[])
    .map(toSummary)
    .filter(
      (topic) => !(topic.author?.id === viewerId && topic.replyCount === 0),
    )
    .slice(0, limit)
    .map((topic) => ({
      topic,
      book: topic.books.find((book) => mine.has(book.id)) ?? null,
      following: following.has(topic.id),
    }));
}
