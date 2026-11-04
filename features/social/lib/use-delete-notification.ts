"use client";

import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteAllNotifications, deleteNotification } from "../actions";
import type { NotificationItem, NotificationsPayload } from "../types";
import { NOTIFICATIONS_KEY } from "./use-notifications";

/** A lista do "Ver todas", em páginas. */
export const ALL_NOTIFICATIONS_KEY = [...NOTIFICATIONS_KEY, "todas"];

export type NotificationsPage = {
  items: NotificationItem[];
  next: string | null;
};

/**
 * Excluir avisos: some na hora, do sino e do "Ver todas", e a lista volta do
 * servidor depois. Se der erro, o aviso volta e o toast conta.
 */
export function useDeleteNotifications() {
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();

  function drop(keep: (item: NotificationItem) => boolean) {
    queryClient.setQueryData<NotificationsPayload>(
      NOTIFICATIONS_KEY,
      (data) => {
        if (!data) return data;
        const items = data.items.filter(keep);
        return {
          ...data,
          items,
          total: Math.max(0, data.total - (data.items.length - items.length)),
        };
      },
    );
    queryClient.setQueryData<InfiniteData<NotificationsPage>>(
      ALL_NOTIFICATIONS_KEY,
      (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.filter(keep),
              })),
            }
          : data,
    );
  }

  function refresh() {
    return queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
  }

  return {
    remove(id: string) {
      drop((item) => item.id !== id);
      startTransition(async () => {
        const result = await deleteNotification(id);
        if (!result.ok) toast.error(result.error);
        await refresh();
      });
    },
    removeAll() {
      drop(() => false);
      queryClient.setQueryData<NotificationsPayload>(
        NOTIFICATIONS_KEY,
        (data) => (data ? { ...data, total: 0 } : data),
      );
      startTransition(async () => {
        const result = await deleteAllNotifications();
        if (!result.ok) toast.error(result.error);
        await refresh();
      });
    },
  };
}
