"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { tweens } from "@/lib/motion";
import { COLLECTION_LIMITS, itemNoteSchema } from "../schemas";

// O contador só aparece perto do limite, para não pesar no campo
const COUNTER_FROM = COLLECTION_LIMITS.note - 40;

type ItemNoteProps = {
  note: string | null;
  editable: boolean;
  bookTitle: string;
  onSave: (note: string | null) => void;
};

/**
 * A nota de "por que está aqui" de um livro na coleção. Quem edita escreve
 * direto no lugar: Enter salva, Shift+Enter quebra a linha, Esc cancela e
 * sair do campo também salva.
 */
export function ItemNote({ note, editable, bookTitle, onSave }: ItemNoteProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  // Enter e Esc já decidem; o blur que vem depois não salva de novo
  const settled = useRef(false);
  const trigger = useRef<HTMLButtonElement>(null);

  if (!editable) {
    return note ? (
      <p className="text-sm text-pretty text-muted-foreground">{note}</p>
    ) : null;
  }

  function open() {
    settled.current = false;
    setDraft(note ?? "");
    setEditing(true);
  }

  function close({ save, refocus }: { save: boolean; refocus: boolean }) {
    if (settled.current) return;
    settled.current = true;
    if (save) {
      const parsed = itemNoteSchema.safeParse(draft);
      if (parsed.success && parsed.data !== note) onSave(parsed.data);
    }
    setEditing(false);
    // Pelo teclado, o foco volta para quem abriu o campo
    if (refocus) requestAnimationFrame(() => trigger.current?.focus());
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {editing ? (
        <motion.div
          key="campo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: tweens.base }}
          exit={{ opacity: 0, transition: tweens.fast }}
          className="flex flex-col gap-1"
        >
          <textarea
            autoFocus
            aria-label={`Nota sobre ${bookTitle}`}
            placeholder="Por que está aqui?"
            value={draft}
            maxLength={COLLECTION_LIMITS.note}
            rows={2}
            onChange={(event) =>
              setDraft(event.target.value.slice(0, COLLECTION_LIMITS.note))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                close({ save: true, refocus: true });
              } else if (event.key === "Escape") {
                event.preventDefault();
                close({ save: false, refocus: true });
              }
            }}
            onBlur={() => close({ save: true, refocus: false })}
            className="field-sizing-content w-full resize-none rounded-control border border-border-strong bg-surface px-2.5 py-2 text-sm placeholder:text-muted-foreground"
          />
          {draft.length >= COUNTER_FROM ? (
            <p className="font-mono text-[11px] text-muted-foreground">
              {COLLECTION_LIMITS.note - draft.length} caracteres restantes
            </p>
          ) : null}
        </motion.div>
      ) : (
        <motion.button
          key="nota"
          ref={trigger}
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: tweens.base }}
          exit={{ opacity: 0, transition: tweens.fast }}
          onClick={open}
          aria-label={note ? `Editar a nota de ${bookTitle}` : undefined}
          className={
            note
              ? "cursor-text rounded-control text-left text-sm text-pretty text-muted-foreground transition-colors hover:text-foreground"
              : "cursor-pointer self-start rounded-control text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          }
        >
          {note ?? "Por que está aqui?"}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
