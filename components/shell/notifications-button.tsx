"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QuietBellIllustration } from "@/components/ui/illustrations";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** Popover de notificações; o tempo real chega na Fase 5. */
export function NotificationsButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações">
          <Bell />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <p className="border-b border-border px-4 py-3 text-sm font-medium">
          Notificações
        </p>
        <EmptyState
          illustration={QuietBellIllustration}
          title="Tudo em dia"
          description="Quando alguém seguir você ou curtir uma coleção, aparece aqui."
          className="rounded-none border-0"
        />
      </PopoverContent>
    </Popover>
  );
}
