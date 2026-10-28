"use client";

import { useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { createContext, use, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { BookVisual } from "@/features/books/types";
import { startReading, updateShelfEntry } from "../../actions";
import { today } from "../../lib/today";
import { WANT_LIST_KEY } from "../../lib/want-list";
import { useAddBook } from "../add-book/add-book-provider";
import { DeckSkeleton } from "./deck-skeleton";

// O baralho só é baixado quando alguém abre o sorteio
const NextReadDialog = dynamic(
  () => import("./next-read-dialog").then((module) => module.NextReadDialog),
  { ssr: false, loading: () => <DeckSkeleton /> },
);

type NextReadContextValue = {
  /** Sorteia entre os livros dados; sem eles, busca a fila de Quero ler. */
  open: (books?: BookVisual[]) => void;
  /** Há conta: o item do ⌘K funciona. */
  enabled: boolean;
};

const NextReadContext = createContext<NextReadContextValue | null>(null);

/**
 * Sortear a próxima leitura (spec §5.4), aberto pela aba Estante e pelo ⌘K.
 * "Começar a ler" fecha na hora; o toast conta quando o livro virou Lendo.
 */
export function NextReadProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [books, setBooks] = useState<BookVisual[] | null>(null);
  const [, startTransition] = useTransition();
  const addBook = useAddBook();
  const queryClient = useQueryClient();
  const returnFocus = useRef<HTMLElement | null>(null);

  function undo(book: BookVisual) {
    startTransition(async () => {
      const result = await updateShelfEntry(book.id, {
        status: "want",
        rating: null,
        startedAt: null,
        finishedAt: null,
        currentPage: null,
      });
      if (!result.ok) {
        toast.error(result.error, { description: book.title });
        return;
      }
      void queryClient.invalidateQueries({ queryKey: WANT_LIST_KEY });
      toast("Voltou para Quero ler", { description: book.title });
    });
  }

  function start(book: BookVisual) {
    setOpen(false);
    const toastId = toast.loading("Começando a leitura…", {
      description: book.title,
    });
    startTransition(async () => {
      const result = await startReading(book.id, today());
      if (!result.ok) {
        toast.error(result.error, { id: toastId, description: book.title });
        return;
      }
      void queryClient.invalidateQueries({ queryKey: WANT_LIST_KEY });
      toast.success("Boa leitura!", {
        id: toastId,
        description: `${book.title} está em Lendo agora.`,
        duration: 6000,
        action: { label: "Desfazer", onClick: () => undo(book) },
      });
    });
  }

  // A fila vazia leva à paleta de adicionar; o foco fica com ela
  function findBook() {
    returnFocus.current = null;
    setOpen(false);
    addBook.open();
  }

  return (
    <NextReadContext
      value={{
        open: (list) => {
          setBooks(list ?? null);
          setOpen(true);
        },
        enabled: addBook.enabled,
      }}
    >
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-describedby={undefined}
          // Sem DialogTrigger, o Radix não sabe a quem devolver o foco
          onOpenAutoFocus={() => {
            const active = document.activeElement;
            returnFocus.current = active instanceof HTMLElement ? active : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus();
          }}
        >
          <DialogTitle className="font-serif text-2xl leading-tight tracking-tight">
            Sua próxima leitura
          </DialogTitle>
          <NextReadDialog
            books={books}
            onStart={start}
            onFindBook={findBook}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </NextReadContext>
  );
}

export function useNextRead() {
  const context = use(NextReadContext);
  if (!context) throw new Error("useNextRead precisa do <NextReadProvider>");
  return context;
}
