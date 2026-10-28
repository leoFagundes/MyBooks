"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import {
  createContext,
  use,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { useShelfFlight } from "@/components/shell/shelf-flight";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { BookVisual } from "@/features/books/types";
import {
  EDITABLE_COLLECTIONS_KEY,
  fetchEditableCollections,
} from "@/features/collections/lib/editable-collections";
import { cn } from "@/lib/utils";
import { copyBook, undoCopy } from "../actions";
import type { CopyStatus } from "../schemas";

/** Onde o livro aparece: cada lugar desenha o Copiar e o selo do seu jeito. */
export type BookActionPlace = "estante" | "grade" | "lista" | "feed";

type CopyTarget = {
  book: BookVisual;
  /** De quem é a estante de onde o livro sai. */
  fromUserId: string;
  /** O item na tela: o popover se ancora nele e o voo parte da capa dele. */
  item: HTMLElement;
};

type CopyContextValue = {
  open: (target: CopyTarget) => void;
  /** Copiados agora há pouco, antes de a estante voltar do servidor. */
  copiedIds: ReadonlySet<string>;
};

const CopyContext = createContext<CopyContextValue | null>(null);

const STATUS_OPTIONS = [
  { value: "want", label: "Quero ler" },
  { value: "reading", label: "Lendo" },
  { value: "read", label: "Lido" },
] as const satisfies readonly { value: CopyStatus; label: string }[];

// A capa do item, para o voo; sem ela, o próprio item
function coverOf(item: HTMLElement) {
  return item.querySelector("[data-copy-source]") ?? item;
}

/**
 * Uma área onde dá para copiar livros de outra pessoa (a estante dela, o
 * feed): um popover só, ancorado no livro escolhido, para não fechar quando
 * o botão que o abriu some (o chip sob a lombada, por exemplo).
 */
export function CopyBookScope({ children }: { children: React.ReactNode }) {
  const flight = useShelfFlight();
  const [target, setTarget] = useState<CopyTarget | null>(null);
  const [open, setOpen] = useState(false);
  const [copiedIds, setCopiedIds] = useState<ReadonlySet<string>>(new Set());
  const [, startTransition] = useTransition();
  const returnFocus = useRef<HTMLElement | null>(null);
  const anchorItem = useRef<HTMLElement | null>(null);
  // O Radix mede a âncora pelo retângulo do item, onde quer que ele esteja
  const anchor = useRef({
    getBoundingClientRect: () =>
      anchorItem.current?.getBoundingClientRect() ?? new DOMRect(),
  });

  function mark(bookId: string, copied: boolean) {
    setCopiedIds((current) => {
      const next = new Set(current);
      if (copied) next.add(bookId);
      else next.delete(bookId);
      return next;
    });
  }

  function undo(book: BookVisual, collectionId: string | null) {
    mark(book.id, false);
    startTransition(async () => {
      const result = await undoCopy(book.id, collectionId);
      if (result.ok) {
        toast("Tirei da estante", { description: book.title });
        return;
      }
      mark(book.id, true);
      toast.error(result.error, { description: book.title });
    });
  }

  function copy(status: CopyStatus, collectionId: string | null) {
    if (!target) return;
    const { book, fromUserId, item } = target;
    setOpen(false);
    // Na hora: a capa voa e o selo aparece; o número e o toast esperam o banco
    flight.fly(coverOf(item), book);
    mark(book.id, true);
    startTransition(async () => {
      const result = await copyBook({
        bookId: book.id,
        status,
        collectionId,
        fromUserId,
      });
      if (!result.ok) {
        mark(book.id, false);
        toast.error(result.error, { description: book.title });
        return;
      }
      const { added, addedToCollection, collectionError, shelfCount } =
        result.data;
      if (!added) {
        toast("Já estava na sua estante", { description: book.title });
        return;
      }
      flight.showCount(shelfCount);
      toast.success(
        addedToCollection ? "Na sua estante e na coleção" : "Na sua estante",
        {
          description: book.title,
          duration: 6000,
          action: {
            label: "Desfazer",
            onClick: () =>
              undo(book, addedToCollection ? collectionId : null),
          },
        },
      );
      if (collectionError) toast.error(`Na coleção, não: ${collectionError}`);
    });
  }

  return (
    <CopyContext
      value={{
        open: (next) => {
          const active = document.activeElement;
          returnFocus.current = active instanceof HTMLElement ? active : null;
          anchorItem.current = next.item;
          setTarget(next);
          setOpen(true);
        },
        copiedIds,
      }}
    >
      {children}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor virtualRef={anchor} />
        <PopoverContent
          side="bottom"
          className="w-72"
          // Sem PopoverTrigger, o foco volta à mão: ao botão que abriu ou,
          // se ele sumiu (o chip da lombada), ao link do livro
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const back = returnFocus.current;
            if (back?.isConnected) back.focus();
            else target?.item.querySelector<HTMLElement>("a")?.focus();
          }}
        >
          {target ? (
            <CopyForm
              key={target.book.id}
              book={target.book}
              onSubmit={copy}
            />
          ) : null}
        </PopoverContent>
      </Popover>
    </CopyContext>
  );
}

export function useCopyBook() {
  const context = use(CopyContext);
  if (!context) throw new Error("useCopyBook precisa do <CopyBookScope>");
  return context;
}

/** Status (Quero ler já marcado) e coleção, como pede o spec §5.4. */
function CopyForm({
  book,
  onSubmit,
}: {
  book: BookVisual;
  onSubmit: (status: CopyStatus, collectionId: string | null) => void;
}) {
  const id = useId();
  const [status, setStatus] = useState<CopyStatus>("want");
  const [collectionId, setCollectionId] = useState("");
  const { data: collections = [] } = useQuery({
    queryKey: EDITABLE_COLLECTIONS_KEY,
    queryFn: fetchEditableCollections,
    staleTime: 0,
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(status, collectionId || null);
      }}
      className="flex flex-col gap-4"
    >
      <p className="text-sm text-pretty">
        Copiar <span className="font-serif text-base">{book.title}</span> para
        a sua estante
      </p>
      <SegmentedControl
        aria-label="Status"
        size="sm"
        options={STATUS_OPTIONS}
        value={status}
        onValueChange={setStatus}
      />
      {collections.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-colecao`}>
            Coleção{" "}
            <span className="font-normal text-muted-foreground">
              (opcional)
            </span>
          </Label>
          <select
            id={`${id}-colecao`}
            value={collectionId}
            onChange={(event) => setCollectionId(event.target.value)}
            className="h-10 w-full cursor-pointer rounded-control border border-border-strong bg-background px-3 text-sm"
          >
            <option value="">Nenhuma</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.emoji
                  ? `${collection.emoji} ${collection.title}`
                  : collection.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <Button type="submit">Copiar</Button>
    </form>
  );
}

// Com mouse, o Copiar aparece no hover ou no foco do livro; no toque, fica
const revealOnHover =
  "can-hover:opacity-0 can-hover:group-hover/livro:opacity-100 can-hover:group-focus-within/livro:opacity-100 focus-visible:opacity-100";

/**
 * O Copiar de um livro de outra pessoa, ou o selo "Na sua estante" quando
 * quem vê já tem o livro. Fica dentro de um item marcado com
 * `data-copy-item` (e a capa com `data-copy-source`).
 */
export function BookShelfAction({
  book,
  fromUserId,
  owned,
  place,
  active = false,
}: {
  book: BookVisual;
  fromUserId: string;
  owned: boolean;
  place: BookActionPlace;
  /** Na Estante: a lombada em destaque (o chip só aparece com ela). */
  active?: boolean;
}) {
  const copy = useCopyBook();
  const has = owned || copy.copiedIds.has(book.id);

  function open(event: React.MouseEvent<HTMLButtonElement>) {
    const item = event.currentTarget.closest<HTMLElement>("[data-copy-item]");
    if (item) copy.open({ book, fromUserId, item });
  }

  if (has) return <OnShelfBadge place={place} active={active} />;

  const label = `Copiar ${book.title} para a sua estante`;
  if (place === "estante") {
    return active ? (
      <Button
        variant="outline"
        size="sm"
        onClick={open}
        aria-label={label}
        className="h-6 animate-[aparecer_var(--duration-fast)_var(--ease-standard)_both] rounded-full px-2 text-[11px]"
      >
        <Plus className="size-3" />
        Copiar
      </Button>
    ) : null;
  }
  if (place === "lista") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={open}
        aria-label={label}
        className={cn("transition-opacity", revealOnHover)}
      >
        <Plus />
        Copiar
      </Button>
    );
  }
  // No feed as capas são pequenas: só o ícone, como o selo
  if (place === "feed") {
    return (
      <Button
        variant="outline"
        size="icon-sm"
        onClick={open}
        aria-label={label}
        className={cn(
          "size-7 rounded-full bg-background/90 backdrop-blur-sm transition-opacity",
          revealOnHover,
        )}
      >
        <Plus className="size-3.5" />
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={open}
      aria-label={label}
      className={cn(
        "h-7 rounded-full bg-background/90 px-2.5 text-xs backdrop-blur-sm transition-opacity",
        revealOnHover,
      )}
    >
      <Plus className="size-3.5" />
      Copiar
    </Button>
  );
}

function OnShelfBadge({
  place,
  active,
}: {
  place: BookActionPlace;
  active: boolean;
}) {
  if (place === "estante") {
    // Um ponto quieto sob a lombada; em destaque, o selo por extenso
    return active ? (
      <span className="flex h-6 animate-[aparecer_var(--duration-fast)_var(--ease-standard)_both] items-center gap-1 rounded-full border border-border bg-background px-2 text-[11px] whitespace-nowrap">
        <Check className="size-3" />
        Na sua estante
      </span>
    ) : (
      <span className="mt-1 block size-1 rounded-full bg-muted-foreground">
        <span className="sr-only">Na sua estante</span>
      </span>
    );
  }
  if (place === "lista") {
    return (
      <span className="flex items-center gap-1 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
        <Check className="size-3" />
        Na sua estante
      </span>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="grid size-7 place-items-center rounded-full border border-border bg-background/90 backdrop-blur-sm">
          <Check className="size-3.5" />
          <span className="sr-only">Na sua estante</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>Na sua estante</TooltipContent>
    </Tooltip>
  );
}
