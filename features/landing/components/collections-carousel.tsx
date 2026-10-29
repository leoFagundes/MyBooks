"use client";

import { animate, type AnimationPlaybackControls } from "motion/react";
import { useRef } from "react";
import { CollectionCard } from "@/features/collections/components/collection-card";
import type { CollectionVisual } from "@/features/collections/types";
import { springs } from "@/lib/motion";
import { routes } from "@/lib/routes";

// Quanto o empurrão leva adiante, por px/ms de velocidade no fim do arraste
const PUSH = 320;
// Abaixo disso, foi um clique, não um arraste
const DRAG_THRESHOLD = 5;

type Drag = {
  pointer: number;
  startX: number;
  startLeft: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  moved: boolean;
};

/**
 * Coleções populares (spec §5.1) numa fileira que rola de lado: o dedo e o
 * trackpad rolam nativo, com snap; o mouse arrasta, e ao soltar a fileira
 * segue com uma mola até o cartão mais perto. As setas do teclado rolam, e o
 * Tab passa pelos cartões.
 */
export function CollectionsCarousel({
  collections,
}: {
  collections: CollectionVisual[];
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const glide = useRef<AnimationPlaybackControls | null>(null);
  const swallowClick = useRef(false);

  function cardStarts(element: HTMLDivElement) {
    const padding = Number.parseFloat(getComputedStyle(element).paddingLeft);
    return [...element.children].map(
      (child) => (child as HTMLElement).offsetLeft - padding,
    );
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const element = scroller.current;
    if (!element || event.pointerType !== "mouse" || event.button !== 0) return;
    glide.current?.stop();
    drag.current = {
      pointer: event.pointerId,
      startX: event.clientX,
      startLeft: element.scrollLeft,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      moved: false,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const element = scroller.current;
    if (!state || !element || event.pointerId !== state.pointer) return;
    const distance = event.clientX - state.startX;
    if (!state.moved && Math.abs(distance) < DRAG_THRESHOLD) return;
    if (!state.moved) {
      state.moved = true;
      element.setPointerCapture(event.pointerId);
      // O snap brigaria com o arraste: volta no fim da mola
      element.style.scrollSnapType = "none";
    }
    element.scrollLeft = state.startLeft - distance;
    const elapsed = event.timeStamp - state.lastTime;
    if (elapsed > 0) state.velocity = (event.clientX - state.lastX) / elapsed;
    state.lastX = event.clientX;
    state.lastTime = event.timeStamp;
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const element = scroller.current;
    if (!state || event.pointerId !== state.pointer) return;
    drag.current = null;
    if (!state.moved || !element) return;
    swallowClick.current = true;
    const max = element.scrollWidth - element.clientWidth;
    const aim = Math.min(
      max,
      Math.max(0, element.scrollLeft - state.velocity * PUSH),
    );
    const starts = cardStarts(element);
    const target = starts.reduce(
      (best, start) =>
        Math.abs(start - aim) < Math.abs(best - aim) ? start : best,
      starts[0] ?? aim,
    );
    glide.current = animate(element.scrollLeft, Math.min(max, target), {
      ...springs.smooth,
      onUpdate: (left) => {
        element.scrollLeft = left;
      },
      onComplete: () => {
        element.style.scrollSnapType = "";
      },
    });
  }

  return (
    <div
      ref={scroller}
      role="region"
      aria-label="Coleções populares"
      tabIndex={0}
      data-lenis-prevent
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      // O clique que encerra um arraste não abre a coleção
      onClickCapture={(event) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
      onDragStart={(event) => event.preventDefault()}
      className="flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-4 overflow-x-auto overscroll-x-contain px-4 pt-2 pb-6 sm:scroll-px-6 sm:gap-5 sm:px-6 can-hover:cursor-grab can-hover:active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
    >
      {collections.map((collection) => (
        <div
          key={collection.id}
          className="w-[min(80vw,19rem)] shrink-0 snap-start"
        >
          <CollectionCard
            collection={collection}
            href={routes.collection(collection.id)}
          />
        </div>
      ))}
    </div>
  );
}
