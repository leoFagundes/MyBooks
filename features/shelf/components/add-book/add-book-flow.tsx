"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { tweens } from "@/lib/motion";
import type { ShelfDetails } from "../../schemas";
import type { ChosenBook } from "./chosen-book";
import { DetailsStep } from "./details-step";
import { ManualStep } from "./manual-step";
import { ScanStep } from "./scan-step";
import { SearchStep } from "./search-step";

type Step =
  | { name: "search" }
  | { name: "scan" }
  | { name: "manual" }
  | { name: "details"; book: ChosenBook };

// Entra em 250ms e sai em 150ms; com movimento reduzido, só opacidade
const stepMotion = {
  className: "flex min-h-0 flex-col overflow-y-auto overscroll-contain",
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: tweens.base },
  exit: { opacity: 0, transition: tweens.fast },
};

/**
 * Os passos da paleta: buscar (ou escanear o código de barras), cadastrar à
 * mão e, por fim, status e nota.
 * No modo coleção (`onPick`), escolher põe o livro nela e volta à busca,
 * que marca o que já entrou.
 */
export function AddBookFlow({
  initialBook,
  startWithScan = false,
  onSave,
  onPick,
  collectionTitle,
}: {
  /** Livro já escolhido (a página do livro): começa no passo de status. */
  initialBook: ChosenBook | null;
  /** Começa na câmera (o ⌘K). */
  startWithScan?: boolean;
  onSave: (
    book: ChosenBook,
    details: ShelfDetails,
    collectionId: string | null,
  ) => void;
  onPick?: (book: ChosenBook) => void;
  collectionTitle?: string;
}) {
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<Step>(
    initialBook
      ? { name: "details", book: initialBook }
      : startWithScan
        ? { name: "scan" }
        : { name: "search" },
  );
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set());

  function choose(book: ChosenBook) {
    if (!onPick) {
      setStep({ name: "details", book });
      return;
    }
    onPick(book);
    setPicked((current) => new Set(current).add(book.visual.id));
    setStep({ name: "search" });
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {step.name === "search" ? (
        <motion.div key="search" {...stepMotion}>
          <SearchStep
            query={query}
            onQueryChange={setQuery}
            onChoose={choose}
            onManual={() => setStep({ name: "manual" })}
            onScan={() => setStep({ name: "scan" })}
            picked={picked}
            context={
              collectionTitle
                ? `Para a coleção “${collectionTitle}”`
                : undefined
            }
          />
        </motion.div>
      ) : step.name === "scan" ? (
        <motion.div key="scan" {...stepMotion}>
          <ScanStep
            onIsbn={(isbn) => {
              setQuery(isbn);
              setStep({ name: "search" });
            }}
            onCancel={() => setStep({ name: "search" })}
          />
        </motion.div>
      ) : step.name === "manual" ? (
        <motion.div key="manual" {...stepMotion}>
          <ManualStep
            initialTitle={query.trim()}
            onBack={() => setStep({ name: "search" })}
            onCreated={choose}
          />
        </motion.div>
      ) : (
        <motion.div key={`details-${step.book.visual.id}`} {...stepMotion}>
          <DetailsStep
            book={step.book}
            // O livro manual já está no catálogo: voltar é buscar de novo
            onBack={() => setStep({ name: "search" })}
            onSave={(details, collectionId) =>
              onSave(step.book, details, collectionId)
            }
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
