"use client";

import Link from "next/link";
import { useState } from "react";
import { BookCover } from "@/features/books/components/book-cover";
import { BookLink } from "@/features/books/components/book-link";
import type { BookVisual } from "@/features/books/types";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { type Block, type Inline, parseMarkdown } from "../lib/markdown";

type Books = Record<string, BookVisual>;

/** O ||spoiler||: borrado até o clique (e de novo no segundo). */
function Spoiler({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setShown((value) => !value)}
      aria-pressed={shown}
      aria-label={shown ? undefined : "Spoiler escondido: mostrar"}
      className={cn(
        "cursor-pointer rounded-sm bg-muted px-1 text-left transition-[filter] duration-200",
        shown ? "blur-none" : "blur-[5px] select-none",
      )}
    >
      <span aria-hidden={!shown}>{children}</span>
    </button>
  );
}

function BookChip({ book }: { book: BookVisual }) {
  return (
    <BookLink
      book={book}
      href={routes.book(book.id)}
      className="inline font-serif underline decoration-border-strong underline-offset-4 hover:decoration-foreground"
    >
      {book.title}
    </BookLink>
  );
}

/** O livro sozinho na linha vira um card: capa, título e autoria. */
function BookCard({ book }: { book: BookVisual }) {
  return (
    <BookLink
      book={book}
      href={routes.book(book.id)}
      className="my-1 flex max-w-sm items-center gap-3 rounded-card border border-border p-3 transition-colors hover:bg-muted"
    >
      <BookCover book={book} size="xs" tilt={false} />
      <span className="flex min-w-0 flex-col">
        <span className="line-clamp-2 font-serif text-base leading-tight">
          {book.title}
        </span>
        <span className="line-clamp-2 text-xs text-muted-foreground">
          {book.authors.join(", ")}
        </span>
      </span>
    </BookLink>
  );
}

function renderInline(nodes: Inline[], books: Books): React.ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.t) {
      case "text":
        return node.v;
      case "br":
        return <br key={index} />;
      case "strong":
        return (
          <strong key={index} className="font-semibold">
            {renderInline(node.c, books)}
          </strong>
        );
      case "em":
        return <em key={index}>{renderInline(node.c, books)}</em>;
      case "spoiler":
        return <Spoiler key={index}>{renderInline(node.c, books)}</Spoiler>;
      case "link":
        return (
          <a
            key={index}
            href={node.href}
            target="_blank"
            rel="nofollow ugc noopener noreferrer"
            className="underline decoration-border-strong underline-offset-4 hover:decoration-foreground"
          >
            {renderInline(node.c, books)}
          </a>
        );
      case "mention":
        return (
          <Link
            key={index}
            href={routes.profile(node.username)}
            className="font-medium hover:underline"
          >
            @{node.username}
          </Link>
        );
      case "book": {
        const book = books[node.id];
        return book ? <BookChip key={index} book={book} /> : null;
      }
    }
  });
}

function renderBlocks(blocks: Block[], books: Books): React.ReactNode[] {
  return blocks.map((block, index) => {
    if (block.t === "quote") {
      return (
        <blockquote
          key={index}
          className="flex flex-col gap-3 border-l-2 border-border-strong pl-4 text-muted-foreground"
        >
          {renderBlocks(block.c, books)}
        </blockquote>
      );
    }
    if (block.t === "ul" || block.t === "ol") {
      const List = block.t;
      return (
        <List
          key={index}
          className={cn(
            "flex flex-col gap-1 pl-5",
            block.t === "ul" ? "list-disc" : "list-decimal",
          )}
        >
          {block.items.map((item, position) => (
            <li key={position}>{renderInline(item, books)}</li>
          ))}
        </List>
      );
    }
    // Um livro sozinho no parágrafo vira o card
    const only = block.c.length === 1 ? block.c[0] : null;
    if (only?.t === "book") {
      const book = books[only.id];
      return book ? <BookCard key={index} book={book} /> : null;
    }
    return <p key={index}>{renderInline(block.c, books)}</p>;
  });
}

/**
 * O texto de um tópico, resposta, sugestão ou comentário, no Markdown leve
 * (features/community/lib/markdown.ts). Nada de HTML de quem escreveu: só a
 * árvore do parser vira elementos.
 */
export function RichText({
  source,
  books = {},
  className,
}: {
  source: string;
  /** Os livros citados ([[livro:<id>]]), já buscados no servidor. */
  books?: Books;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex max-w-prose flex-col gap-4 text-base leading-relaxed text-pretty break-words",
        className,
      )}
    >
      {renderBlocks(parseMarkdown(source), books)}
    </div>
  );
}
