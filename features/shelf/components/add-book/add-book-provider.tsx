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
import { ActionError, actionErrorMessage, unwrapAction } from "@/lib/action";
import { addBook, removeFromShelf } from "../../actions";
import type { ShelfDetails } from "../../schemas";
import { AddBookFlow } from "./add-book-flow";
import type { ChosenBook } from "./chosen-book";

/** A coleção que recebe os livros escolhidos na paleta. */
export type CollectionTarget = { id: string; title: string };

/** O livro chegou à estante, mas não à coleção escolhida. */
class PartlySaved extends ActionError {}

/** Põe o livro na estante e, se houver, na coleção escolhida. */
async function putOnShelf(
  book: ChosenBook,
  details: ShelfDetails,
  collectionId: string | null,
) {
  const { bookId } = await unwrapAction(addBook({ book: book.ref, details }));
  if (!collectionId) return { bookId, inCollection: false };
  // O livro já está no catálogo
  const added = await addBookToCollection(collectionId, { catalogId: bookId });
  if (!added.ok) throw new PartlySaved(`Na sua estante, mas: ${added.error}`);
  return { bookId, inCollection: true };
}

type AddBookContextValue = {
  open: () => void;
  /** Abre direto no passo de status e nota (a página do livro). */
  openWith: (book: ChosenBook) => void;
  /** Escolher um livro o põe na coleção, e a busca segue aberta. */
  openForCollection: (collection: CollectionTarget) => void;
  /** Abre direto na câmera, para ler o código de barras (só no toque). */
  openScanner: () => void;
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
  setScanFirst: (scanFirst: boolean) => void;
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
  const [scanFirst, setScanFirst] = useState(false);
  const [, startTransition] = useTransition();
  const returnFocus = useRef<HTMLElement | null>(null);

  function undo(bookId: string, title: string) {
    startTransition(async () => {
      const result = await removeFromShelf(bookId);
      if (result.ok) toast("Tirei da estante", { description: title });
      else toast.error(result.error);
    });
  }

  function save(
    book: ChosenBook,
    details: ShelfDetails,
    collectionId: string | null,
  ) {
    setOpen(false);
    const title = book.visual.title;
    startTransition(async () => {
      // Um toast só, do carregando ao pronto (ou ao erro)
      const saving = putOnShelf(book, details, collectionId);
      toast.promise(saving, {
        loading: "Pondo na estante…",
        description: title,
        success: ({ bookId, inCollection }) => ({
          message: inCollection
            ? "Na sua estante e na coleção"
            : "Na sua estante",
          description: title,
          duration: 6000,
          action: { label: "Desfazer", onClick: () => undo(bookId, title) },
        }),
        error: (error: unknown) => ({
          message: actionErrorMessage(error),
          description: title,
          // Já está na estante: tentar de novo duplicaria o pedido
          action:
            error instanceof PartlySaved
              ? undefined
              : {
                  label: "Tentar de novo",
                  onClick: () => save(book, details, collectionId),
                },
        }),
      });
      await saving.catch(() => {});
    });
  }

  function pick(book: ChosenBook, target: CollectionTarget) {
    const title = book.visual.title;
    startTransition(async () => {
      const adding = unwrapAction(addBookToCollection(target.id, book.ref));
      toast.promise(adding, {
        loading: "Pondo na coleção…",
        description: title,
        success: ({ added }) => ({
          message: added
            ? `Em ${target.title}`
            : `Já estava em ${target.title}`,
          description: title,
        }),
        error: (error: unknown) => ({
          message: actionErrorMessage(error),
          description: title,
          action: {
            label: "Tentar de novo",
            onClick: () => pick(book, target),
          },
        }),
      });
      await adding.catch(() => {});
    });
  }

  return (
    <AddBookContext
      value={{
        open: () => {
          setInitialBook(null);
          setCollection(null);
          setScanFirst(false);
          setOpen(true);
        },
        openWith: (book) => {
          setInitialBook(book);
          setCollection(null);
          setScanFirst(false);
          setOpen(true);
        },
        openForCollection: (target) => {
          setInitialBook(null);
          setCollection(target);
          setScanFirst(false);
          setOpen(true);
        },
        openScanner: () => {
          setInitialBook(null);
          setCollection(null);
          setScanFirst(true);
          setOpen(true);
        },
        enabled,
      }}
    >
      <ControlsContext
        value={{
          setOpen,
          setEnabled,
          setInitialBook,
          setCollection,
          setScanFirst,
        }}
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
            startWithScan={scanFirst}
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
  const { setOpen, setEnabled, setInitialBook, setCollection, setScanFirst } =
    controls;

  useEffect(() => {
    setEnabled(true);
    function onKeyDown(event: KeyboardEvent) {
      // O autopreenchimento do navegador (senha salva) dispara keydown sem key
      if (!event.key || event.key.toLowerCase() !== "n") return;
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat)
        return;
      if (event.defaultPrevented || isTyping(event.target)) return;
      // Modal, gaveta, menu ou paleta abertos travam a rolagem do body
      if (document.body.hasAttribute("data-scroll-locked")) return;
      event.preventDefault();
      setInitialBook(null);
      setCollection(null);
      setScanFirst(false);
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      setEnabled(false);
    };
  }, [setOpen, setEnabled, setInitialBook, setCollection, setScanFirst]);

  return null;
}
