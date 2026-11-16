"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/initials";
import { springs, tweens } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { setReaderBlock } from "../actions";
import type { BlockedReader } from "../queries";

/**
 * Quem a pessoa bloqueou ou silenciou, para desfazer daqui (Configurações).
 * Desfazer tira da lista na hora; se o servidor recusar, a pessoa volta.
 */
export function BlockedReaders({ initial }: { initial: BlockedReader[] }) {
  const [list, setList] = useState(initial);
  const [, startTransition] = useTransition();

  function undo(item: BlockedReader) {
    setList((current) =>
      current.filter((entry) => entry.reader.id !== item.reader.id),
    );
    startTransition(async () => {
      const result = await setReaderBlock(item.reader.id, null);
      if (!result.ok) {
        setList((current) => [item, ...current]);
        toast.error(result.error);
        return;
      }
      toast.success(
        item.kind === "block"
          ? `@${item.reader.username} desbloqueado`
          : `@${item.reader.username} não está mais silenciado`,
      );
    });
  }

  if (list.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Ninguém por aqui. Para bloquear ou silenciar alguém, use o “…” no perfil
        da pessoa.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      <AnimatePresence initial={false}>
        {list.map((item) => (
          <motion.li
            key={item.reader.id}
            layout
            exit={{ opacity: 0, transition: tweens.fast }}
            transition={springs.smooth}
            className="flex items-center gap-3 py-3"
          >
            <Avatar className="size-9">
              {item.reader.avatarUrl ? (
                <AvatarImage src={item.reader.avatarUrl} alt="" />
              ) : null}
              <AvatarFallback className="text-xs">
                {initials(item.reader.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <Link
                href={routes.profile(item.reader.username)}
                className="line-clamp-2 text-sm hover:underline"
              >
                {item.reader.displayName}
              </Link>
              <p className="font-mono text-xs text-muted-foreground">
                @{item.reader.username} ·{" "}
                {item.kind === "block" ? "bloqueado" : "silenciado"}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => undo(item)}>
              {item.kind === "block" ? "Desbloquear" : "Desfazer"}
            </Button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
