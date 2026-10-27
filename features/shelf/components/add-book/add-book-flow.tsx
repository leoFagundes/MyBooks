"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { tweens } from "@/lib/motion";
import type { ShelfDetails } from "../../schemas";
import type { ChosenBook } from "./chosen-book";
import { DetailsStep } from "./details-step";
import { ManualStep } from "./manual-step";
import { SearchStep } from "./search-step";

type Step =
  | { name: "search" }
  | { name: "manual" }
  | { name: "details"; book: ChosenBook };

// Entra em 250ms e sai em 150ms; com movimento reduzido, só opacidade
const stepMotion = {
  className: "flex min-h-0 flex-col overflow-y-auto overscroll-contain",
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: tweens.base },
  exit: { opacity: 0, transition: tweens.fast },
};

/** Os passos da paleta: buscar, cadastrar à mão e, por fim, status e nota. */
export function AddBookFlow({
  onSave,
}: {
  onSave: (book: ChosenBook, details: ShelfDetails) => void;
}) {
  const [query, setQuery] = useState("");
  const [step, setStep] = useState<Step>({ name: "search" });

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {step.name === "search" ? (
        <motion.div key="search" {...stepMotion}>
          <SearchStep
            query={query}
            onQueryChange={setQuery}
            onChoose={(book) => setStep({ name: "details", book })}
            onManual={() => setStep({ name: "manual" })}
          />
        </motion.div>
      ) : step.name === "manual" ? (
        <motion.div key="manual" {...stepMotion}>
          <ManualStep
            initialTitle={query.trim()}
            onBack={() => setStep({ name: "search" })}
            onCreated={(book) => setStep({ name: "details", book })}
          />
        </motion.div>
      ) : (
        <motion.div key={`details-${step.book.visual.id}`} {...stepMotion}>
          <DetailsStep
            book={step.book}
            // O livro manual já está no catálogo: voltar é buscar de novo
            onBack={() => setStep({ name: "search" })}
            onSave={(details) => onSave(step.book, details)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
