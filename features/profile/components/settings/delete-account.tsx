"use client";

import { useId, useState, useTransition } from "react";
import { SwapText } from "@/components/motion/swap-text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/features/auth/components/auth-card";
import { routes } from "@/lib/routes";
import { deleteAccount } from "../../actions";

/**
 * Excluir a conta: o diálogo só libera o botão com o @ digitado. Depois, a
 * página recarrega do zero na landing, que agradece pelas leituras.
 */
export function DeleteAccount({ username }: { username: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDeleting] = useTransition();
  const matches = typed.trim().toLowerCase().replace(/^@+/, "") === username;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!matches) {
      setError(`Digite @${username} para confirmar`);
      return;
    }
    startDeleting(async () => {
      const result = await deleteAccount({ confirm: typed });
      if (!result.ok) {
        setError(result.fieldErrors?.confirm ?? result.error);
        return;
      }
      // Recarrega do zero, como o sair: nada da sessão antiga fica na memória
      window.location.assign(
        new URL(`${routes.home}?conta=excluida`, window.location.origin),
      );
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (deleting) return;
        setOpen(next);
        if (!next) {
          setTyped("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" className="self-start">
          Excluir minha conta
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir sua conta?</DialogTitle>
          <DialogDescription>
            Sua estante, suas citações, suas coleções e quem você segue somem
            para sempre. Os livros que você cadastrou continuam no catálogo, sem
            o seu nome.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-confirmar`}>
              Para confirmar, digite @{username}
            </Label>
            <Input
              id={`${id}-confirmar`}
              value={typed}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-confirmar-erro` : undefined}
              onChange={(event) => {
                setError(null);
                setTyped(event.target.value);
              }}
            />
            <FieldError
              id={`${id}-confirmar-erro`}
              message={error ?? undefined}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={deleting}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              disabled={!matches || deleting}
              aria-busy={deleting}
            >
              <SwapText
                text={deleting ? "Excluindo…" : "Excluir para sempre"}
              />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
