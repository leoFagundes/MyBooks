"use client";

import { Ban, Flag, MoreHorizontal, VolumeX } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportDialog } from "@/features/community/components/report-dialog";
import { setReaderBlock } from "../actions";

type BlockKind = "block" | "mute" | null;

/**
 * O "…" do perfil dos outros: silenciar (some do feed e do sino, sem a
 * pessoa saber), bloquear (com confirmação: desfaz o seguir dos dois lados e
 * fecha a estante) e denunciar o perfil para a equipe.
 */
export function ReaderMenu({
  reader,
  block,
}: {
  reader: { id: string; username: string };
  block: BlockKind;
}) {
  const [optimistic, setOptimistic] = useState(block);
  const [seen, setSeen] = useState(block);
  if (block !== seen) {
    setSeen(block);
    setOptimistic(block);
  }
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [reporting, setReporting] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const handle = `@${reader.username}`;

  function change(next: BlockKind, message: string) {
    const previous = optimistic;
    setOptimistic(next);
    startTransition(async () => {
      const result = await setReaderBlock(reader.id, next);
      if (!result.ok) {
        setOptimistic(previous);
        toast.error(result.error);
        return;
      }
      toast.success(message);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={trigger}
            variant="outline"
            size="icon"
            aria-label={`Mais ações para ${handle}`}
            disabled={pending}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {optimistic !== "block" ? (
            <DropdownMenuItem
              onSelect={() =>
                optimistic === "mute"
                  ? change(null, `${handle} não está mais silenciado`)
                  : change("mute", `${handle} silenciado`)
              }
            >
              <VolumeX />
              {optimistic === "mute" ? "Deixar de silenciar" : "Silenciar"}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            variant={optimistic === "block" ? "default" : "destructive"}
            onSelect={() =>
              optimistic === "block"
                ? change(null, `${handle} desbloqueado`)
                : setConfirming(true)
            }
          >
            <Ban />
            {optimistic === "block" ? "Desbloquear" : "Bloquear"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setReporting(true)}>
            <Flag />
            Denunciar perfil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            trigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Bloquear {handle}?</DialogTitle>
            <DialogDescription>
              Vocês deixam de se seguir, {handle} não vê mais a sua estante,
              suas coleções e citações, nem pode responder ao que você publica
              no fórum. Você também não recebe mais avisos dessa conta. A pessoa
              não é avisada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirming(false);
                change("block", `${handle} bloqueado`);
              }}
            >
              Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReportDialog
        target={reporting ? { type: "profile", id: reader.id } : null}
        open={reporting}
        onOpenChange={setReporting}
      />
    </>
  );
}
