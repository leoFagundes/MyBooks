"use client";

import { ManualBookForm } from "@/features/books/components/manual-book-form";
import type { ChosenBook } from "./chosen-book";

/**
 * Cadastro à mão, com a capa mudando enquanto a pessoa escreve e o desenho da
 * capa (imagem, estilo e cor). O livro entra no catálogo e segue para o passo
 * de status e nota.
 */
export function ManualStep({
  initialTitle,
  onBack,
  onCreated,
}: {
  initialTitle: string;
  onBack: () => void;
  onCreated: (book: ChosenBook) => void;
}) {
  return (
    <ManualBookForm
      mode={{ kind: "create", initialTitle }}
      onCancel={onBack}
      onSaved={(book) =>
        onCreated({ ref: { catalogId: book.id }, visual: book })
      }
    />
  );
}
