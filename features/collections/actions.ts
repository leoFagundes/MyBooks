"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { catalogIdFor } from "@/features/books/lib/catalog-ref";
import { type BookRef, bookRefSchema } from "@/features/shelf/schemas";
import { type ActionResult, fieldErrorsFrom } from "@/lib/action";
import { requireViewer } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { firstPositions, positionBetween } from "./lib/position";
import {
  collectionBookIdSchema,
  type CollectionFormData,
  collectionFormSchema,
  collectionIdSchema,
  type ItemPlacement,
  itemNoteSchema,
  itemPlacementSchema,
  positionSchema,
} from "./schemas";

const NOT_EDITOR = "Você não edita mais esta coleção.";
const NOT_OWNER = "Só quem criou a coleção pode fazer isso.";

// O formulário manda os dados já limpos (vazio vira null); o servidor
// confere de novo com o mesmo schema
function parseForm(input: CollectionFormData) {
  return collectionFormSchema.safeParse({
    ...input,
    description: input.description ?? "",
    emoji: input.emoji ?? "",
  });
}

/** Nova coleção, de quem está vendo. Leva até a página dela. */
export async function createCollection(
  input: CollectionFormData,
): Promise<ActionResult<{ id: string }>> {
  const parsed = parseForm(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Confira o título e o emoji.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }
  const viewer = await requireViewer();
  const { title, description, emoji, visibility, isCollaborative } =
    parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .insert({
      owner_id: viewer.id,
      title,
      description,
      emoji,
      visibility,
      is_collaborative: isCollaborative,
    })
    .select("id")
    .single();
  if (error) {
    return { ok: false, error: "Não deu para criar a coleção. Tente de novo." };
  }
  updateTag(`profile:${viewer.username}`);
  return { ok: true, data: { id: data.id } };
}

/** Título, descrição, emoji, quem vê e se é colaborativa: só a dona. */
export async function updateCollection(
  id: string,
  input: CollectionFormData,
): Promise<ActionResult> {
  const collectionId = collectionIdSchema.safeParse(id);
  const parsed = parseForm(input);
  if (!collectionId.success || !parsed.success) {
    return {
      ok: false,
      error: "Confira o título e o emoji.",
      fieldErrors: parsed.success ? undefined : fieldErrorsFrom(parsed.error),
    };
  }
  const viewer = await requireViewer();
  const { title, description, emoji, visibility, isCollaborative } =
    parsed.data;
  const supabase = await createClient();
  // A RLS filtra quem não é dona: nenhuma linha muda, e não há erro
  const { data, error } = await supabase
    .from("collections")
    .update({
      title,
      description,
      emoji,
      visibility,
      is_collaborative: isCollaborative,
    })
    .eq("id", collectionId.data)
    .select("id");
  if (error) {
    return { ok: false, error: "Não deu para salvar. Tente de novo." };
  }
  if (data.length === 0) return { ok: false, error: NOT_OWNER };
  updateTag(`collection:${collectionId.data}`);
  updateTag(`profile:${viewer.username}`);
  return { ok: true, data: undefined };
}

/**
 * Apaga a coleção com os livros e as notas (a confirmação é da interface) e
 * leva às coleções da dona: redirecionar daqui evita a página apagada
 * aparecer como "não está aqui" antes de sair dela.
 */
export async function deleteCollection(id: string): Promise<ActionResult> {
  const collectionId = collectionIdSchema.safeParse(id);
  if (!collectionId.success) return { ok: false, error: NOT_OWNER };
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId.data)
    .select("id");
  if (error) {
    return { ok: false, error: "Não deu para excluir. Tente de novo." };
  }
  if (data.length === 0) return { ok: false, error: NOT_OWNER };
  updateTag(`collection:${collectionId.data}`);
  updateTag(`profile:${viewer.username}`);
  redirect(routes.profileTab(viewer.username, "colecoes"));
}

/**
 * Põe um livro (do catálogo ou de fora, como na paleta) depois do último.
 * Com `placement`, volta ao lugar de onde saiu, com a nota (o "Desfazer").
 * Já estando lá, não muda nada e avisa (`added: false`).
 */
export async function addBookToCollection(
  id: string,
  book: BookRef,
  placement?: ItemPlacement,
): Promise<ActionResult<{ bookId: string; added: boolean }>> {
  const collectionId = collectionIdSchema.safeParse(id);
  const ref = bookRefSchema.safeParse(book);
  const place =
    placement === undefined ? null : itemPlacementSchema.safeParse(placement);
  if (!collectionId.success || !ref.success || place?.success === false) {
    return { ok: false, error: "Esse livro não deu certo." };
  }
  const viewer = await requireViewer();
  const bookId = await catalogIdFor(ref.data, viewer.id);
  if (!bookId.ok) return bookId;

  const supabase = await createClient();
  let position = place?.data.position;
  if (!position) {
    const { data: last } = await supabase
      .from("collection_items")
      .select("position")
      .eq("collection_id", collectionId.data)
      .order("position", { ascending: false })
      .order("book_id", { ascending: false })
      .limit(1)
      .maybeSingle();
    position = positionBetween(last?.position ?? null, null);
  }

  const { error } = await supabase.from("collection_items").insert({
    collection_id: collectionId.data,
    book_id: bookId.data,
    position,
    note: place?.data.note ?? null,
    added_by: viewer.id,
  });
  if (error?.code === "23505") {
    return { ok: true, data: { bookId: bookId.data, added: false } };
  }
  if (error) {
    // A RLS recusa quem não edita (42501)
    return {
      ok: false,
      error:
        error.code === "42501"
          ? NOT_EDITOR
          : "Não deu para pôr na coleção. Tente de novo.",
    };
  }
  updateTag(`collection:${collectionId.data}`);
  updateTag(`book:${bookId.data}`);
  return { ok: true, data: { bookId: bookId.data, added: true } };
}

/** Tira o livro da coleção; devolve onde ele estava, para o "Desfazer". */
export async function removeFromCollection(
  id: string,
  bookId: string,
): Promise<ActionResult<ItemPlacement>> {
  const collectionId = collectionIdSchema.safeParse(id);
  const book = collectionBookIdSchema.safeParse(bookId);
  if (!collectionId.success || !book.success) {
    return { ok: false, error: "Esse livro não deu certo." };
  }
  await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collection_items")
    .delete()
    .eq("collection_id", collectionId.data)
    .eq("book_id", book.data)
    .select("position, note");
  if (error) {
    return {
      ok: false,
      error: "Não deu para tirar da coleção. Tente de novo.",
    };
  }
  const [removed] = data;
  if (!removed) return { ok: false, error: NOT_EDITOR };
  updateTag(`collection:${collectionId.data}`);
  updateTag(`book:${book.data}`);
  return { ok: true, data: { position: removed.position, note: removed.note } };
}

/** O livro arrastado ganha uma chave nova entre as vizinhas do destino. */
export async function moveCollectionItem(
  id: string,
  bookId: string,
  position: string,
): Promise<ActionResult> {
  const collectionId = collectionIdSchema.safeParse(id);
  const book = collectionBookIdSchema.safeParse(bookId);
  const key = positionSchema.safeParse(position);
  if (!collectionId.success || !book.success || !key.success) {
    return { ok: false, error: "Não deu para mover agora." };
  }
  await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collection_items")
    .update({ position: key.data })
    .eq("collection_id", collectionId.data)
    .eq("book_id", book.data)
    .select("book_id");
  if (error) return { ok: false, error: "Não deu para mover agora." };
  if (data.length === 0) return { ok: false, error: NOT_EDITOR };
  updateTag(`collection:${collectionId.data}`);
  return { ok: true, data: undefined };
}

const orderSchema = z.array(collectionBookIdSchema).min(1).max(1000);

/**
 * Renumera a coleção na ordem pedida (empate de chaves ou chave comprida).
 * As chaves novas saem daqui, não do cliente.
 */
export async function rebalanceCollection(
  id: string,
  orderedBookIds: string[],
): Promise<ActionResult> {
  const collectionId = collectionIdSchema.safeParse(id);
  const order = orderSchema.safeParse(orderedBookIds);
  if (!collectionId.success || !order.success) {
    return { ok: false, error: "Não deu para mover agora." };
  }
  await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_collection_positions", {
    target: collectionId.data,
    book_ids: order.data,
    positions: firstPositions(order.data.length),
  });
  if (error) return { ok: false, error: "Não deu para mover agora." };
  if (data === 0) return { ok: false, error: NOT_EDITOR };
  updateTag(`collection:${collectionId.data}`);
  return { ok: true, data: undefined };
}

/** A nota do livro na coleção ("por que está aqui"); vazia apaga. */
export async function saveItemNote(
  id: string,
  bookId: string,
  note: string | null,
): Promise<ActionResult> {
  const collectionId = collectionIdSchema.safeParse(id);
  const book = collectionBookIdSchema.safeParse(bookId);
  const text = itemNoteSchema.safeParse(note ?? "");
  if (!collectionId.success || !book.success) {
    return { ok: false, error: "Não deu para salvar a nota." };
  }
  if (!text.success) {
    return { ok: false, error: text.error.issues[0]?.message ?? "Nota longa" };
  }
  await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("collection_items")
    .update({ note: text.data })
    .eq("collection_id", collectionId.data)
    .eq("book_id", book.data)
    .select("book_id");
  if (error) return { ok: false, error: "Não deu para salvar a nota." };
  if (data.length === 0) return { ok: false, error: NOT_EDITOR };
  updateTag(`collection:${collectionId.data}`);
  return { ok: true, data: undefined };
}

const toggleSchema = z.boolean();

/**
 * Curtir ou desfazer a curtida. Repetir não muda nada: a curtida que já
 * existe fica (on conflict do nothing), e a que não existe não se apaga.
 */
export async function setLike(
  id: string,
  liked: boolean,
): Promise<ActionResult> {
  const collectionId = collectionIdSchema.safeParse(id);
  const value = toggleSchema.safeParse(liked);
  if (!collectionId.success || !value.success) {
    return { ok: false, error: "Não deu para curtir agora." };
  }
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = value.data
    ? await supabase
        .from("collection_likes")
        .upsert(
          { user_id: viewer.id, collection_id: collectionId.data },
          { onConflict: "user_id,collection_id", ignoreDuplicates: true },
        )
    : await supabase
        .from("collection_likes")
        .delete()
        .eq("user_id", viewer.id)
        .eq("collection_id", collectionId.data);
  if (error) return { ok: false, error: "Não deu para curtir agora." };
  updateTag(`collection:${collectionId.data}`);
  return { ok: true, data: undefined };
}

/** Salvar a coleção para ver depois (só quem salvou sabe); idempotente. */
export async function setSave(
  id: string,
  saved: boolean,
): Promise<ActionResult> {
  const collectionId = collectionIdSchema.safeParse(id);
  const value = toggleSchema.safeParse(saved);
  if (!collectionId.success || !value.success) {
    return { ok: false, error: "Não deu para salvar agora." };
  }
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = value.data
    ? await supabase
        .from("collection_saves")
        .upsert(
          { user_id: viewer.id, collection_id: collectionId.data },
          { onConflict: "user_id,collection_id", ignoreDuplicates: true },
        )
    : await supabase
        .from("collection_saves")
        .delete()
        .eq("user_id", viewer.id)
        .eq("collection_id", collectionId.data);
  if (error) return { ok: false, error: "Não deu para salvar agora." };
  updateTag(`collection:${collectionId.data}`);
  // A lista "Salvas" do perfil de quem salvou
  updateTag(`profile:${viewer.username}`);
  return { ok: true, data: undefined };
}
