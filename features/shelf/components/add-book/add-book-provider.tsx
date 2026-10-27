"use client";

import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { addBookToCollection } from "@/features/collections/actions";
import { addBook, removeFromShelf } from "../../actions";
import type { ShelfDetails } from "../../schemas";
import { AddBookFlow } from "./add-book-flow";
import type { ChosenBook } from "./chosen-book";

/** A coleção que recebe os livros escolhidos na paleta. */
export type CollectionTarget = { id: string; title: string };

type AddBookContextValue = {
  open: () => void;
  /** Abre direto no passo de status e nota (a página do livro). */
  openWith: (book: ChosenBook) => void;
  /** Escolher um livro o põe na coleção, e a busca segue aberta. */
  openForCollection: (collection: CollectionTarget) => void;
  /** Há conta: o +, a tecla N e o item do ⌘K funcionam. */
  enabled: boolean;
};

const AddBookContext = createContext<AddBookContextValue | null>(null);

// Só os setters do estado, que não mudam: o atalho não se reinscreve a cada render
type Controls = {
  setOpen: (open: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  setInitialBook: (book: ChosenBook | null) => void;
  setCollection: (collection: CollectionTarget | null) => void;
};
const ControlsContext = createContext<Controls | null>(null);

/**
 * Paleta de adicionar livro (spec §5.5), aberta pelo +, pela tecla N e pelo
 * ⌘K. Salvar fecha na hora; o toast conta quando o livro chegou à estante.
 */
export function AddBookProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [initialBook, setInitialBook] = useState<ChosenBook | null>(null);
  const [collection, setCollection] = useState<CollectionTarget | null>(null);
  const [, startTransition] = useTransition();
  const returnFocus = useRef<HTMLElement | null>(null);

  function undo(bookId: string, title: string) {
    startTransition(async () => {
      const result = await removeFromShelf(bookId);
      if (result.ok) toast("Tirei da estante", { description: title });
      else toast.error(result.error);
    });
  }

  function save(book: ChosenBook, details: ShelfDetails) {
    setOpen(false);
    const title = book.visual.title;
    const toastId = toast.loading("Pondo na estante…", { description: title });
    startTransition(async () => {
      const result = await addBook({ book: book.ref, details });
      if (!result.ok) {
        toast.error(result.error, {
          id: toastId,
          description: title,
          action: {
            label: "Tentar de novo",
            onClick: () => save(book, details),
          },
        });
        return;
      }
      toast.success("Na sua estante", {
        id: toastId,
        description: title,
        duration: 6000,
        action: {
          label: "Desfazer",
          onClick: () => undo(result.data.bookId, title),
        },
      });
    });
  }

  function pick(book: ChosenBook, target: CollectionTarget) {
    const title = book.visual.title;
    const toastId = toast.loading("Pondo na coleção…", { description: title });
    startTransition(async () => {
      const result = await addBookToCollection(target.id, book.ref);
      if (!result.ok) {
        toast.error(result.error, {
          id: toastId,
          description: title,
          action: {
            label: "Tentar de novo",
            onClick: () => pick(book, target),
          },
        });
        return;
      }
      toast.success(
        result.data.added
          ? `Em ${target.title}`
          : `Já estava em ${target.title}`,
        { id: toastId, description: title },
      );
    });
  }

  return (
    <AddBookContext
      value={{
        open: () => {
          setInitialBook(null);
          setCollection(null);
          setOpen(true);
        },
        openWith: (book) => {
          setInitialBook(book);
          setCollection(null);
          setOpen(true);
        },
        openForCollection: (target) => {
          setInitialBook(null);
          setCollection(target);
          setOpen(true);
        },
        enabled,
      }}
    >
      <ControlsContext
        value={{ setOpen, setEnabled, setInitialBook, setCollection }}
      >
        {children}
      </ControlsContext>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          // Nunca passa da tela: o passo que não cabe rola por dentro
          className="top-[6dvh] flex max-h-[88dvh] max-w-xl translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:top-[10dvh] sm:max-h-[84dvh]"
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
          <DialogTitle className="sr-only">
            {collection
              ? `Adicionar livro a ${collection.title}`
              : "Adicionar livro"}
          </DialogTitle>
          <AddBookFlow
            initialBook={initialBook}
            onSave={save}
            collectionTitle={collection?.title}
            onPick={collection ? (book) => pick(book, collection) : undefined}
          />
        </DialogContent>
      </Dialog>
    </AddBookContext>
  );
}

export function useAddBook() {
  const context = use(AddBookContext);
  if (!context) throw new Error("useAddBook precisa do <AddBookProvider>");
  return context;
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/**
 * Fica na barra quando há conta: liga o + da pílula, o item do ⌘K e a tecla
 * N (fora de campos de texto e com nenhuma janela aberta).
 */
export function AddBookShortcut() {
  const controls = use(ControlsContext);
  if (!controls)
    throw new Error("AddBookShortcut precisa do <AddBookProvider>");
  const { setOpen, setEnabled, setInitialBook, setCollection } = controls;

  useEffect(() => {
    setEnabled(true);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "n") return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat)
        return;
      if (event.defaultPrevented || isTyping(event.target)) return;
      // Modal, gaveta, menu ou paleta abertos travam a rolagem do body
      if (document.body.hasAttribute("data-scroll-locked")) return;
      event.preventDefault();
      setInitialBook(null);
      setCollection(null);
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      setEnabled(false);
    };
  }, [setOpen, setEnabled, setInitialBook, setCollection]);

  return null;
}
