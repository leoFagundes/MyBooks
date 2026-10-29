"use client";

import { type MotionStyle, motion } from "motion/react";
import { BookCover } from "@/features/books/components/book-cover";
import { bookColor, coverInk } from "@/features/books/lib/color";
import type { BookVisual } from "@/features/books/types";
import { cn } from "@/lib/utils";

/**
 * O livro como uma caixa 3D: a capa na frente e a lombada à esquerda, como
 * num livro de verdade. Girar 90° em Y mostra a lombada, desenhada igual à
 * `BookSpine` da prateleira. Só enfeite: fica fora da árvore de acessibilidade.
 */
export function BookBox({
  book,
  height,
  spineWidth,
  style,
  className,
}: {
  book: BookVisual;
  height: number;
  spineWidth: number;
  style?: MotionStyle;
  className?: string;
}) {
  const width = Math.round(height / 1.5);
  const { background, ink } = coverInk(bookColor(book));
  const author = book.authors[0] ?? "";

  return (
    <motion.div
      aria-hidden
      className={cn("absolute top-0 left-0 transform-3d", className)}
      style={{ width, height, ...style }}
    >
      <div
        className="absolute inset-0"
        style={{ transform: `translateZ(${spineWidth / 2}px)` }}
      >
        <BookCover book={book} size="sm" tilt={false} className="w-full" />
      </div>
      <div
        className={cn(
          "spine absolute top-0 flex flex-col items-center justify-between overflow-hidden rounded-cover bg-(--cover) py-3",
          ink === "ink" ? "text-ink" : "text-paper",
        )}
        style={
          {
            left: (width - spineWidth) / 2,
            width: spineWidth,
            height,
            transform: `rotateY(-90deg) translateZ(${width / 2}px)`,
            "--cover": background,
          } as React.CSSProperties
        }
      >
        <span className="max-h-[calc(100%-3rem)] truncate font-serif text-[13px] leading-none [writing-mode:vertical-rl]">
          {book.title}
        </span>
        {spineWidth >= 24 && author ? (
          <span className="max-h-10 truncate font-mono text-[8px] leading-none tracking-wider uppercase [writing-mode:vertical-rl]">
            {author}
          </span>
        ) : null}
      </div>
    </motion.div>
  );
}
