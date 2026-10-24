"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { springs } from "@/lib/motion";
import { CAN_HOVER, useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { bookColor, pickInk } from "../lib/color";
import type { BookVisual } from "../types";

const MAX_TILT = 6;

const widths = { sm: "w-24", md: "w-36", lg: "w-52", fill: "w-full" } as const;
const sizes = {
  sm: "96px",
  md: "144px",
  lg: "208px",
  fill: "(min-width: 768px) 20vw, 45vw",
} as const;

type BookCoverProps = {
  book: BookVisual;
  size?: keyof typeof widths;
  /** Inclinação 3D seguindo o cursor (só com mouse e sem movimento reduzido). */
  tilt?: boolean;
  priority?: boolean;
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
  priority = false,
  className,
}: BookCoverProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
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
  const showImage = Boolean(book.coverUrl) && !failed;

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

  return (
    <div
      data-testid={`capa-${book.id}`}
      data-cover={showImage ? "image" : "generated"}
      className={cn("perspective-[900px]", widths[size], className)}
      style={{ "--cover": color } as React.CSSProperties}
    >
      <motion.div
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        style={{ rotateX, rotateY }}
        className="book-cover relative aspect-2/3 overflow-hidden rounded-cover bg-(--cover)"
      >
        {showImage ? (
          <Image
            src={book.coverUrl ?? ""}
            alt={`Capa de ${book.title}`}
            fill
            sizes={sizes[size]}
            priority={priority}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            // Enquanto carrega, aparece a cor da capa; a imagem chega com fade
            className={cn(
              "object-cover transition-opacity duration-400",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
        ) : (
          <GeneratedCover book={book} color={color} />
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
    </div>
  );
}

/** Capa tipográfica: título em Instrument Serif, autor em Geist Mono. */
function GeneratedCover({ book, color }: { book: BookVisual; color: string }) {
  return (
    <div
      role="img"
      aria-label={`Capa de ${book.title}`}
      className={cn(
        "@container absolute inset-0 flex flex-col justify-between p-[10%]",
        pickInk(color) === "ink" ? "text-ink" : "text-paper",
      )}
    >
      <p className="line-clamp-5 font-serif text-[13cqi] leading-[1.05] tracking-tight text-balance">
        {book.title}
      </p>
      <p className="line-clamp-2 font-mono text-[6.5cqi] leading-snug tracking-wider uppercase opacity-80">
        {book.authors.join(", ")}
      </p>
    </div>
  );
}
