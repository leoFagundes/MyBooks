"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { markNotificationsRead } from "@/features/social/actions";
import { NotificationsPanel } from "@/features/social/components/notifications-panel";
import {
  NOTIFICATIONS_KEY,
  useNotifications,
} from "@/features/social/lib/use-notifications";
import type { NotificationsPayload } from "@/features/social/types";
import { springs, tweens } from "@/lib/motion";

const NO_IDS: ReadonlySet<string> = new Set();

/**
 * O sino da barra (spec §5.10): o selo conta os avisos sem ler e chega em
 * tempo real; abrir o popover marca tudo como lido.
 */
export function NotificationsButton({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const query = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState(NO_IDS);
  const [, startTransition] = useTransition();
  const unread = query.data?.unread ?? 0;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next || !userId) return;
    const data =
      queryClient.getQueryData<NotificationsPayload>(NOTIFICATIONS_KEY);
    setFresh(
      new Set(data?.items.filter((item) => item.unread).map((item) => item.id)),
    );
    if (!data || data.unread === 0) {
      void query.refetch();
      return;
    }
    // O selo some na hora; a lista volta do servidor já lida
    queryClient.setQueryData<NotificationsPayload>(NOTIFICATIONS_KEY, {
      ...data,
      unread: 0,
    });
    startTransition(async () => {
      await markNotificationsRead();
      await queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    });
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            unread > 0
              ? `Notificações, ${unread} ${unread === 1 ? "nova" : "novas"}`
              : "Notificações"
          }
          className="relative"
        >
          <Bell />
          <AnimatePresence>
            {unread > 0 ? (
              <motion.span
                key="selo"
                aria-hidden
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6, transition: tweens.fast }}
                transition={springs.snappy}
                className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] leading-none text-primary-foreground"
              >
                {unread > 9 ? "9+" : <AnimatedNumber value={unread} />}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] gap-0 p-0"
      >
        <NotificationsPanel
          query={query}
          fresh={fresh}
          onNavigate={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
