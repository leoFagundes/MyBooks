"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { BookDetails } from "../queries";
import { ManualBookForm } from "./manual-book-form";

/**
 * "Editar livro", na página de um livro cadastrado à mão, para quem o
 * cadastrou: o mesmo formulário do cadastro, com os dados e a capa (imagem,
 * estilo e cor). Salvo, a página se atualiza sozinha (updateTag).
 */
export function EditBookButton({ book }: { book: BookDetails }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="self-start">
          <Pencil />
          Editar livro
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[88dvh] max-w-xl flex-col gap-0 overflow-hidden p-0">
        <div className="flex min-h-0 flex-col overflow-y-auto overscroll-contain">
          <div className="flex flex-col gap-1 px-5 pt-5 pr-12 sm:px-6 sm:pt-6">
            <DialogTitle>Editar livro</DialogTitle>
            <DialogDescription>
              Você cadastrou este livro: corrija os dados e escolha como a capa
              aparece para todo mundo.
            </DialogDescription>
          </div>
          <ManualBookForm
            mode={{ kind: "edit", book }}
            onCancel={() => setOpen(false)}
            onSaved={() => {
              setOpen(false);
              toast.success("Livro atualizado");
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
