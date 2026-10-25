"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const UNIQUE_VIOLATION = "23505";
const readerId = z.uuid();

type FollowStatus = "accepted" | "pending";

// Os contadores do perfil das duas pessoas mudam
async function refreshProfiles(viewerUsername: string, otherId: string) {
  updateTag(`profile:${viewerUsername}`);
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", otherId)
    .maybeSingle();
  if (data) updateTag(`profile:${data.username}`);
}

/**
 * Segue alguém. Perfil privado vira pedido (o banco decide o status);
 * seguir duas vezes não é erro.
 */
export async function followReader(
  id: string,
): Promise<ActionResult<{ status: FollowStatus }>> {
  const parsed = readerId.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Leitor inválido." };
  const viewer = await requireViewer();
  if (parsed.data === viewer.id) {
    return { ok: false, error: "Não dá para seguir o próprio perfil." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: viewer.id, following_id: parsed.data });
  if (error && error.code !== UNIQUE_VIOLATION) {
    return { ok: false, error: "Não deu para seguir agora. Tente de novo." };
  }
  const { data } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_id", viewer.id)
    .eq("following_id", parsed.data)
    .maybeSingle();
  await refreshProfiles(viewer.username, parsed.data);
  return {
    ok: true,
    data: { status: data?.status === "accepted" ? "accepted" : "pending" },
  };
}

/** Deixa de seguir, ou desiste do pedido. */
export async function unfollowReader(id: string): Promise<ActionResult> {
  const parsed = readerId.safeParse(id);
  if (!parsed.success) return { ok: false, error: "Leitor inválido." };
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", viewer.id)
    .eq("following_id", parsed.data);
  if (error) return { ok: false, error: "Não deu agora. Tente de novo." };
  await refreshProfiles(viewer.username, parsed.data);
  return { ok: true, data: undefined };
}
