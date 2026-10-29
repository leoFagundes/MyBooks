"use client";

import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  type DropAnimation,
  getClientRect,
  KeyboardCode,
  KeyboardSensor,
  type MeasuringConfiguration,
  MeasuringStrategy,
  MouseSensor,
  type ScreenReaderInstructions,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { GripVerticalIcon, XIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Route } from "next";
import { type RefObject, useId, useRef, useState } from "react";
import { BookCover } from "@/features/books/components/book-cover";
import { BookLink } from "@/features/books/components/book-link";
import type { BookVisual } from "@/features/books/types";
import { durations, easing, springs, tweens } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { type MovePlan, planMove } from "../lib/position";
import type { CollectionItemVisual } from "../types";
import { ItemNote } from "./item-note";

// Mede cada livro pelo lugar dele na grade, sem a transformação em voo do
// Motion: a colisão e o pouso miram onde o livro vai ficar
const measure = (node: HTMLElement) =>
  getClientRect(node, { ignoreTransform: true });
const measuring: MeasuringConfiguration = {
  draggable: { measure },
  droppable: { measure, strategy: MeasuringStrategy.Always },
};

// No pouso, só a capa do lugar de destino espera a capa erguida chegar
const dropAnimation: DropAnimation = {
  duration: durations.base * 1000,
  easing: `cubic-bezier(${easing.join(", ")})`,
  sideEffects: ({ active }) => {
    const cover = active.node.querySelector<HTMLElement>("[data-cover]");
    if (!cover) return;
    cover.style.opacity = "0";
    return () => {
      cover.style.opacity = "";
    };
  },
};

const instructions: ScreenReaderInstructions = {
  draggable:
    "Para mover um livro, aperte espaço. Escolha o lugar com as setas, aperte espaço para soltar ou Esc para cancelar.",
};

type SortableBooksProps = {
  /** Na ordem da coleção. */
  items: CollectionItemVisual[];
  editable: boolean;
  onMove: (plan: MovePlan) => void;
  onNote: (bookId: string, note: string | null) => void;
  /** Tirar da coleção (só para quem edita). */
  onRemove?: (bookId: string) => void;
  bookHref?: (book: BookVisual) => Route;
};

/**
 * Os livros da coleção em grade, reordenáveis por quem edita (spec §5.8).
 * O dnd-kit cuida do gesto (mouse, toque e teclado, com anúncios); durante o
 * arraste a lista já muda de ordem e o `layout` do Motion leva as vizinhas
 * com mola. Ao soltar, uma chave nova só para o livro movido (ou a
 * renumeração, se houver empate).
 */
export function SortableBooks({
  items,
  editable,
  onMove,
  onNote,
  onRemove,
  bookHref = (book) => routes.book(book.id),
}: SortableBooksProps) {
  const id = useId();
  const reduced = useReducedMotion() ?? false;
  const [liveOrder, setLiveOrder] = useState<string[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  // A ordem do arraste também numa ref, atualizada no próprio evento: soltar
  // logo depois da última seta não pode depender de o React já ter
  // renderizado a troca
  const dragOrder = useRef<string[]>([]);
  const suppressClick = useRef(false);

  const byId = new Map(items.map((item) => [item.book.id, item]));
  const committed = items.map((item) => item.book.id);
  const order = liveOrder ?? committed;
  const titleOf = (bookId: UniqueIdentifier) =>
    byId.get(String(bookId))?.book.title ?? "O livro";
  const placeIn = (list: string[], bookId: UniqueIdentifier) =>
    list.indexOf(String(bookId)) + 1;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // A página acompanha o livro na hora: com rolagem suave, as setas
      // apertadas durante a animação miravam o lugar errado
      scrollBehavior: "auto",
      keyboardCodes: {
        start: [KeyboardCode.Space],
        cancel: [KeyboardCode.Esc],
        end: [KeyboardCode.Space],
      },
    }),
  );

  // O dnd-kit anuncia depois de chamar os handlers abaixo, então a ref já
  // tem a ordem daquele momento
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Você pegou ${titleOf(active.id)}, na posição ${placeIn(committed, active.id)} de ${committed.length}.`,
    // Sobre o próprio lugar não há o que dizer: calar deixa ouvir o anúncio
    // anterior (o dnd-kit dispara isso logo depois de pegar e de cada troca)
    onDragOver: ({ active, over }) => {
      if (!over) return `${titleOf(active.id)} está fora da grade.`;
      if (over.id === active.id) return undefined;
      return `${titleOf(active.id)} agora está na posição ${placeIn(dragOrder.current, active.id)} de ${committed.length}.`;
    },
    onDragEnd: ({ active }) =>
      `${titleOf(active.id)} ficou na posição ${placeIn(dragOrder.current, active.id)} de ${committed.length}.`,
    onDragCancel: ({ active }) =>
      `Movimento cancelado. ${titleOf(active.id)} voltou para a posição ${placeIn(committed, active.id)}.`,
  };

  function reset() {
    setActiveId(null);
    setLiveOrder(null);
    // O clique que o navegador manda ao soltar não abre o livro
    setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  }

  function handleDragStart({ active }: DragStartEvent) {
    suppressClick.current = true;
    dragOrder.current = committed;
    setActiveId(String(active.id));
    setLiveOrder(committed);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over || active.id === over.id) return;
    const list = dragOrder.current;
    const from = list.indexOf(String(active.id));
    const to = list.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    dragOrder.current = arrayMove(list, from, to);
    setLiveOrder(dragOrder.current);
  }

  function handleDragEnd({ active }: DragEndEvent) {
    const plan = planMove(
      items.map((item) => ({ id: item.book.id, position: item.position })),
      committed.indexOf(String(active.id)),
      dragOrder.current.indexOf(String(active.id)),
    );
    if (plan) onMove(plan);
    reset();
  }

  const active = activeId ? byId.get(activeId) : undefined;

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={measuring}
      accessibility={{ announcements, screenReaderInstructions: instructions }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={reset}
    >
      <SortableContext
        items={order}
        strategy={rectSortingStrategy}
        disabled={!editable}
      >
        <ul
          aria-label="Livros da coleção"
          className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          {/* O livro tirado sai esmaecendo, e as vizinhas fecham o vão com mola */}
          <AnimatePresence initial={false}>
            {order.map((bookId) => {
              const item = byId.get(bookId);
              return item ? (
                <SortableBook
                  key={bookId}
                  item={item}
                  editable={editable}
                  href={bookHref(item.book)}
                  reduced={reduced}
                  suppressClick={suppressClick}
                  onNote={onNote}
                  onRemove={onRemove}
                />
              ) : null;
            })}
          </AnimatePresence>
        </ul>
      </SortableContext>
      <DragOverlay dropAnimation={reduced ? null : dropAnimation}>
        {active ? <LiftedCover book={active.book} reduced={reduced} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

type SortableBookProps = {
  item: CollectionItemVisual;
  editable: boolean;
  href: Route;
  reduced: boolean;
  suppressClick: RefObject<boolean>;
  onNote: (bookId: string, note: string | null) => void;
  onRemove?: (bookId: string) => void;
};

function SortableBook({
  item,
  editable,
  href,
  reduced,
  suppressClick,
  onNote,
  onRemove,
}: SortableBookProps) {
  const { book } = item;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useSortable({
      id: book.id,
      disabled: !editable,
      attributes: { roleDescription: "livro reordenável" },
    });

  return (
    <motion.li
      ref={setNodeRef}
      data-title={book.title}
      layout={reduced ? false : "position"}
      transition={springs.snappy}
      exit={{ opacity: 0, scale: reduced ? 1 : 0.96, transition: tweens.fast }}
      className="flex min-w-0 flex-col gap-2"
    >
      {/* O arraste começa na capa; a nota fica livre para selecionar texto */}
      <div
        data-cover
        {...(editable ? listeners : {})}
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        className={cn(
          "group relative touch-manipulation rounded-cover",
          // Mover e Tirar ficam nos cantos de cima da capa
          editable && "[--capa-chip:2.5rem]",
          isDragging &&
            "outline-2 outline-offset-2 outline-border-strong outline-dashed",
        )}
      >
        <div className={cn(isDragging && "opacity-0")}>
          <BookLink
            book={book}
            href={href}
            variant="cover"
            draggable={false}
            className="block rounded-cover"
          >
            <BookCover book={book} size="fill" />
          </BookLink>
        </div>
        {editable ? (
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            aria-label={`Mover ${book.title}`}
            className="absolute top-1.5 left-1.5 flex size-8 cursor-grab items-center justify-center rounded-control bg-surface/90 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing pointer-coarse:opacity-100"
          >
            <GripVerticalIcon className="size-4" />
          </button>
        ) : null}
        {editable && onRemove ? (
          <button
            type="button"
            aria-label={`Tirar ${book.title} da coleção`}
            onClick={() => onRemove(book.id)}
            className="absolute top-1.5 right-1.5 flex size-8 cursor-pointer items-center justify-center rounded-control bg-surface/90 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 pointer-coarse:opacity-100"
          >
            <XIcon className="size-4" />
          </button>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="line-clamp-2 font-serif text-base leading-tight">
          {book.title}
        </p>
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {book.authors.join(", ")}
        </p>
      </div>
      <ItemNote
        note={item.note}
        editable={editable}
        bookTitle={book.title}
        onSave={(note) => onNote(book.id, note)}
      />
    </motion.li>
  );
}

// A capa erguida segue o ponteiro: cresce um pouco e gira, como uma carta
function LiftedCover({
  book,
  reduced,
}: {
  book: BookVisual;
  reduced: boolean;
}) {
  return (
    <motion.div
      initial={{ scale: 1, rotate: 0 }}
      animate={reduced ? undefined : { scale: 1.04, rotate: 2 }}
      transition={springs.snappy}
      className="cursor-grabbing"
    >
      <BookCover book={book} size="fill" tilt={false} />
    </motion.div>
  );
}
