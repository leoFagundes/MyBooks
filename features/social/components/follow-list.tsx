"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ReadersIllustration } from "@/components/ui/illustrations";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { springs, tweens } from "@/lib/motion";
import { removeFollower } from "../actions";
import type { ReaderListItem } from "../queries";
import { ReaderRow } from "./reader-row";

export type FollowList = "seguidores" | "seguindo";

const listKey = (profileId: string, list: FollowList) => [
  "leitores",
  profileId,
  list,
];

async function fetchList(
  profileId: string,
  list: FollowList,
): Promise<ReaderListItem[]> {
  const response = await fetch(
    `/api/readers/${profileId}/follows?lista=${list}`,
  );
  if (!response.ok) throw new Error(String(response.status));
  const body = (await response.json()) as { readers: ReaderListItem[] };
  return body.readers;
}

/**
 * O contador de seguidores ou de seguindo vira um botão que abre a lista
 * (só quando quem vê pode ver o perfil).
 */
export function FollowListButton({
  profileId,
  username,
  list,
  isSelf,
  children,
}: {
  profileId: string;
  username: string;
  list: FollowList;
  isSelf: boolean;
  children: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="cursor-pointer rounded-sm transition-colors hover:text-foreground"
        >
          {children}
        </button>
      </DialogTrigger>
      <DialogContent className="gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>
            {list === "seguidores" ? "Seguidores" : "Seguindo"}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            @{username}
          </DialogDescription>
        </DialogHeader>
        <ListBody profileId={profileId} list={list} isSelf={isSelf} />
      </DialogContent>
    </Dialog>
  );
}

function ListBody({
  profileId,
  list,
  isSelf,
}: {
  profileId: string;
  list: FollowList;
  isSelf: boolean;
}) {
  const queryClient = useQueryClient();
  const key = listKey(profileId, list);
  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchList(profileId, list),
    staleTime: 0,
  });

  if (query.isPending) {
    return (
      <div aria-busy aria-label="Carregando a lista" className="px-6 pb-6">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3 py-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 pt-2 pb-8 text-center">
        <p className="text-sm text-muted-foreground">
          Não deu para carregar a lista agora.
        </p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (query.data.length === 0) {
    return (
      <div className="px-6 pb-6">
        <EmptyState
          illustration={ReadersIllustration}
          title={
            !isSelf
              ? "Ninguém por aqui ainda"
              : list === "seguidores"
                ? "Ninguém segue você ainda"
                : "Você ainda não segue ninguém"
          }
          description={
            isSelf && list === "seguindo"
              ? "No Explorar tem gente que lê o que você lê."
              : undefined
          }
        />
      </div>
    );
  }

  function forget(id: string) {
    queryClient.setQueryData<ReaderListItem[]>(key, (current) =>
      current?.filter((reader) => reader.id !== id),
    );
  }

  return (
    <ul className="max-h-[60dvh] divide-y divide-border overflow-y-auto overscroll-contain px-6 pb-3 focus-visible:-outline-offset-2">
      <AnimatePresence initial={false}>
        {query.data.map((reader) => (
          <motion.li
            key={reader.id}
            layout
            exit={{ opacity: 0, transition: tweens.fast }}
            transition={springs.snappy}
          >
            <ReaderRow
              reader={reader}
              state={reader.state}
              action={
                isSelf && list === "seguidores" ? (
                  <RemoveFollower
                    reader={reader}
                    onRemoved={() => forget(reader.id)}
                  />
                ) : undefined
              }
            />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function RemoveFollower({
  reader,
  onRemoved,
}: {
  reader: ReaderListItem;
  onRemoved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    setOpen(false);
    startTransition(async () => {
      const result = await removeFollower(reader.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onRemoved();
      toast(`@${reader.username} não segue mais você`);
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          aria-label={`Tirar @${reader.username} dos seus seguidores`}
        >
          Tirar
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <p className="text-pretty">
          Tirar @{reader.username} dos seus seguidores? A pessoa não fica
          sabendo.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={remove}>
            Tirar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
