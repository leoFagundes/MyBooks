"use client";

import { PenLine } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { BookVisual } from "@/features/books/types";
import { routes } from "@/lib/routes";
import type { ForumCategory } from "../types";
import { emptyDraft, TopicEditor } from "./topic-editor";

/**
 * "Novo tópico": abre o editor na gaveta. Sem conta, leva a entrar (e volta
 * para cá). Na página do livro, já vem com ele e na categoria de discussões.
 * O rascunho fica guardado por conta, e volta ao abrir de novo.
 */
export function NewTopicButton({
  viewer,
  categories,
  category = "geral",
  book,
  label = "Novo tópico",
  variant = "primary",
  next = "/comunidade",
}: {
  /** O @ de quem está vendo (a chave do rascunho); null sem conta. */
  viewer: string | null;
  categories: ForumCategory[];
  category?: string;
  book?: BookVisual;
  label?: string;
  variant?: "primary" | "outline";
  /** Para onde voltar depois de entrar. */
  next?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!viewer) {
    return (
      <Button variant={variant} asChild>
        <Link href={{ pathname: routes.entrar, query: { next } }}>
          <PenLine />
          {label}
        </Link>
      </Button>
    );
  }
  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <PenLine />
        {label}
      </Button>
      <TopicEditor
        open={open}
        onOpenChange={setOpen}
        categories={categories}
        initial={emptyDraft(category, book ? [book] : [])}
        draftKey={`mybooks:rascunho-topico:${viewer}`}
      />
    </>
  );
}
