"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { NotificationsPayload } from "../types";

export const NOTIFICATIONS_KEY = ["notificacoes"];

async function fetchNotifications(): Promise<NotificationsPayload> {
  const response = await fetch("/api/notifications");
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as NotificationsPayload;
}

/**
 * Os avisos de quem está vendo, em tempo real: o banco toca o canal privado
 * `notificacoes:<id>` (Broadcast) a cada aviso novo, e a lista é buscada de
 * novo. Sem id (a vitrine do /dev), nada é buscado.
 */
export function useNotifications(userId: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: fetchNotifications,
    enabled: userId !== "",
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    // O canal privado passa pela RLS de realtime.messages com o JWT da sessão
    void supabase.realtime.setAuth().then(() => {
      if (cancelled) return;
      channel = supabase
        .channel(`notificacoes:${userId}`, { config: { private: true } })
        .on("broadcast", { event: "nova" }, () => {
          void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
        })
        .subscribe();
    });
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
}
