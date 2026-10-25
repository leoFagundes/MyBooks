"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import Image from "next/image";
import { useState, ViewTransition, type ViewTransitionClass } from "react";
import { springs } from "@/lib/motion";
import { CAN_HOVER, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { bookColor, coverInk } from "../lib/color";
import { COVER_RADIUS_PX } from "../lib/cover";
import { coverName } from "../lib/transition-names";
import type { BookVisual } from "../types";
import { useIsInsideSource } from "./cover-transition";

const MAX_TILT = 6;

const widths = {
  xs: "w-10",
  sm: "w-24",
  md: "w-36",
  lg: "w-52",
  fill: "w-full",
} as const;
const sizes = {
  xs: "40px",
  sm: "96px",
  md: "144px",
  lg: "208px",
  fill: "(min-width: 768px) 20vw, 45vw",
} as const;

// Capas que já chegaram nesta visita, por endereço e tamanho. Quando uma delas
// monta de novo (a troca entre grade e lista, por exemplo), vem do cache e
// aparece na hora, sem repetir o fade.
const arrivedCovers = new Set<string>();

type BookCoverProps = {
  book: BookVisual;
  size?: keyof typeof widths;
  /** Inclinação 3D seguindo o cursor (só com mouse e sem movimento reduzido). */
  tilt?: boolean;
  /** Pré-carrega a imagem no <head>: só para a capa que é o LCP da página. */
  preload?: boolean;
  /** Capas com o mesmo layoutId viajam de um lugar para outro (Motion). */
  layoutId?: string;
  /**
   * Nome da viagem entre páginas (View Transitions). Dentro de um BookLink
   * vem sozinho, só na capa apertada.
   */
  transitionName?: string;
  /** Animação quando o par se forma (padrão: "capa"). */
  transitionShare?: ViewTransitionClass;
  className?: string;
};

/**
 * Capa do livro (spec §4): a imagem real quando existe; senão, uma capa
 * tipográfica na cor derivada do título. Ao passar o mouse, inclina até 6°
 * com mola e ganha um reflexo de luz (spec §3, momento 4).
 */
export function BookCover({
  book,
  size = "md",
  tilt = true,
  preload = false,
  layoutId,
  transitionName,
  transitionShare = "capa",
  className,
}: BookCoverProps) {
  const insideSource = useIsInsideSource();
  const name =
    transitionName ?? (insideSource ? coverName(book.id) : undefined);
  const [failed, setFailed] = useState(false);
  const reduced = useReducedMotion() ?? false;
  const canHover = useMediaQuery(CAN_HOVER);
  const tiltOn = tilt && canHover && !reduced;

  const rotateX = useSpring(0, springs.snappy);
  const rotateY = useSpring(0, springs.snappy);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);
  const glareOpacity = useSpring(0, springs.smooth);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, var(--glare-color), transparent 62%)`;

  const color = bookColor(book);
  const readable = coverInk(color);
  const showImage = Boolean(book.coverUrl) && !failed;
  const coverKey = `${book.coverUrl}|${size}`;

  // Esconde só a imagem que ainda vai chegar, para ela entrar com fade. Vinda
  // do servidor ela já nasce visível: sem JS, ou antes de hidratar, aparece.
  function hideUntilLoaded(image: HTMLImageElement | null) {
    if (!image || image.complete || image.naturalWidth > 0) return;
    if (arrivedCovers.has(coverKey)) return;
    image.dataset.loading = "";
  }

  function onLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    arrivedCovers.add(coverKey);
    delete event.currentTarget.dataset.loading;
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!tiltOn) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    rotateY.set((x - 0.5) * 2 * MAX_TILT);
    rotateX.set(-(y - 0.5) * 2 * MAX_TILT);
    glareX.set(x * 100);
    glareY.set(y * 100);
    glareOpacity.set(1);
  }

  function onPointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
    glareOpacity.set(0);
  }

  // Antes da foto da transição: a capa apertada volta reta na hora
  function onPointerDown() {
    rotateX.jump(0);
    rotateY.jump(0);
    glareOpacity.jump(0);
  }

  return (
    <div
      data-testid={`capa-${book.id}`}
      data-cover={showImage ? "image" : "generated"}
      className={cn("perspective-[900px]", widths[size], className)}
      // Atrás da imagem, a cor da capa; na capa tipográfica, a versão legível
      style={
        {
          "--cover": showImage ? color : readable.background,
        } as React.CSSProperties
      }
    >
      <ViewTransition name={name} share={transitionShare} default="none">
        <motion.div
          layoutId={layoutId}
          // Na troca de vista a capa nova assume na hora, sem esmaecer com a antiga
          layoutCrossfade={false}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onPointerDown={onPointerDown}
          style={{ rotateX, rotateY, borderRadius: COVER_RADIUS_PX }}
          className="book-cover relative aspect-2/3 overflow-hidden bg-(--cover)"
        >
          {showImage ? (
            <Image
              ref={hideUntilLoaded}
              src={book.coverUrl ?? ""}
              alt={`Capa de ${book.title}`}
              fill
              sizes={sizes[size]}
              preload={preload}
              onLoad={onLoad}
              onError={() => setFailed(true)}
              // Enquanto carrega, aparece a cor da capa; a imagem chega com fade
              className="object-cover transition-opacity duration-400 data-loading:opacity-0"
            />
          ) : (
            <GeneratedCover book={book} ink={readable.ink} />
          )}
          <span aria-hidden className="book-fold" />
          {tiltOn ? (
            <motion.span
              aria-hidden
              className="cover-glare"
              style={{ opacity: glareOpacity, background: glare }}
            />
          ) : null}
        </motion.div>
      </ViewTransition>
    </div>
  );
}

/** Capa tipográfica: título em Instrument Serif, autor em Geist Mono. */
function GeneratedCover({
  book,
  ink,
}: {
  book: BookVisual;
  ink: "ink" | "paper";
}) {
  return (
    <div
      role="img"
      aria-label={`Capa de ${book.title}`}
      className={cn(
        "@container absolute inset-0 flex flex-col justify-between p-[10%]",
        ink === "ink" ? "text-ink" : "text-paper",
      )}
    >
      <p className="line-clamp-5 font-serif text-[13cqi] leading-[1.05] tracking-tight text-balance">
        {book.title}
      </p>
      <p className="line-clamp-2 font-mono text-[6.5cqi] leading-snug tracking-wider uppercase">
        {book.authors.join(", ")}
      </p>
    </div>
  );
}
