"use client";

import { useId, useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reportContent } from "../actions";
import { REPORT_REASONS, type ReportReason, type ReportTarget } from "../types";

/**
 * Denunciar (MELHORIAS 8): o motivo e, se quiser, um detalhe. Vai para a fila
 * da equipe no painel; a mesma janela serve ao fórum e às sugestões.
 */
export function ReportDialog({
  target,
  open,
  onOpenChange,
}: {
  target: { type: ReportTarget; id: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const id = useId();
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!target) return;
    setError(null);
    startTransition(async () => {
      const result = await reportContent({
        targetType: target.type,
        targetId: target.id,
        reason,
        details,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Denúncia enviada", {
        description: "A equipe vai olhar. Obrigado por ajudar.",
      });
      setDetails("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Denunciar</DialogTitle>
            <DialogDescription>
              Ninguém além da equipe vê quem denunciou.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">O motivo</legend>
            {REPORT_REASONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2.5 text-sm"
              >
                <input
                  type="radio"
                  name={`${id}-motivo`}
                  checked={reason === option.value}
                  onChange={() => setReason(option.value)}
                  className="size-4 accent-foreground"
                />
                {option.label}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-detalhe`}>
              Quer contar mais? (opcional)
            </Label>
            <Textarea
              id={`${id}-detalhe`}
              rows={2}
              maxLength={500}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
            />
          </div>
          <div aria-live="polite">
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? "Enviando…" : "Denunciar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
