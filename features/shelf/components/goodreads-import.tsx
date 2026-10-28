"use client";

import { FileUp } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { springs, tweens } from "@/lib/motion";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { finishImport, importBooksBatch } from "../actions";
import { type GoodreadsExport, readGoodreadsExport } from "../lib/goodreads";
import { IMPORT_BATCH, type ImportedBook, type ShelfStatus } from "../schemas";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
// Quantos títulos que não deram certo aparecem no resumo
const FAILED_SHOWN = 8;

const STATUS_LABEL: Record<ShelfStatus, [string, string]> = {
  read: ["lido", "lidos"],
  reading: ["lendo", "lendo"],
  want: ["quero ler", "quero ler"],
  abandoned: ["abandonado", "abandonados"],
};

type Phase =
  | { name: "idle"; error: string | null }
  | { name: "ready"; fileName: string; data: GoodreadsExport }
  | { name: "importing"; total: number; done: number; current: string }
  | {
      name: "done";
      added: number;
      kept: number;
      failed: string[];
      stopped: boolean;
    };

const books = (count: number) =>
  count === 1 ? "1 livro" : `${formatNumber(count)} livros`;

const fade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: tweens.base },
  exit: { opacity: 0, transition: tweens.fast },
};

/**
 * Importar a biblioteca do Goodreads (spec §5.10). O CSV é lido aqui no
 * navegador; os livros vão ao servidor de 5 em 5, e cada um acha o seu no
 * catálogo (ou entra nele). Importar de novo não duplica nada.
 */
export function GoodreadsImport({ username }: { username: string }) {
  const [phase, setPhase] = useState<Phase>({ name: "idle", error: null });
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const stop = useRef(false);

  async function read(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setPhase({
        name: "idle",
        error: "Esse arquivo é grande demais (até 20 MB).",
      });
      return;
    }
    const result = readGoodreadsExport(await file.text());
    if ("error" in result) setPhase({ name: "idle", error: result.error });
    else if (result.books.length === 0) {
      setPhase({ name: "idle", error: "Não achamos livros nesse arquivo." });
    } else setPhase({ name: "ready", fileName: file.name, data: result });
  }

  async function run(list: ImportedBook[]) {
    stop.current = false;
    let added = 0;
    let kept = 0;
    const failed: string[] = [];
    for (let start = 0; start < list.length; start += IMPORT_BATCH) {
      if (stop.current) break;
      const batch = list.slice(start, start + IMPORT_BATCH);
      setPhase({
        name: "importing",
        total: list.length,
        done: start,
        current: batch[0]?.title ?? "",
      });
      const result = await importBooksBatch(batch).catch(() => null);
      if (!result?.ok) {
        failed.push(...batch.map((book) => book.title));
        continue;
      }
      result.data.outcomes.forEach((outcome, index) => {
        if (outcome === "added") added += 1;
        else if (outcome === "kept") kept += 1;
        else failed.push(batch[index]?.title ?? "");
      });
    }
    await finishImport().catch(() => null);
    setPhase({ name: "done", added, kept, failed, stopped: stop.current });
  }

  const reset = () => setPhase({ name: "idle", error: null });

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">Importar do Goodreads</h3>
      <AnimatePresence mode="popLayout" initial={false}>
        {phase.name === "idle" ? (
          <motion.div key="idle" {...fade} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void read(event.dataTransfer.files[0]);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-card border border-dashed border-border-strong px-5 py-7 text-center transition-colors",
                dragging ? "bg-muted" : "can-hover:hover:bg-muted",
              )}
            >
              <FileUp className="size-6 text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium">
                Solte aqui o CSV do Goodreads
              </span>
              <span className="text-xs text-muted-foreground">
                ou toque para escolher o arquivo
              </span>
            </button>
            <input
              ref={input}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(event) => {
                void read(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            {phase.error ? (
              <p role="alert" className="text-xs text-destructive">
                {phase.error}
              </p>
            ) : (
              <p className="text-xs text-pretty text-muted-foreground">
                No Goodreads: Meus livros → Importar e exportar → Exportar
                biblioteca. Livros que já estão na sua estante ficam como estão.
              </p>
            )}
          </motion.div>
        ) : null}

        {phase.name === "ready" ? (
          <motion.div
            key="ready"
            {...fade}
            className="flex flex-col gap-4 rounded-card border border-border p-4"
          >
            <div className="flex flex-col gap-1">
              <p className="truncate font-mono text-xs text-muted-foreground">
                {phase.fileName}
              </p>
              <p className="font-serif text-xl">
                {books(phase.data.books.length)}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {(["read", "reading", "want", "abandoned"] as const)
                  .map((status) => {
                    const count = phase.data.books.filter(
                      (book) => book.status === status,
                    ).length;
                    if (count === 0) return null;
                    const [one, many] = STATUS_LABEL[status];
                    return `${formatNumber(count)} ${count === 1 ? one : many}`;
                  })
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {phase.data.truncated ? (
                <p className="text-xs text-pretty text-muted-foreground">
                  O arquivo passa de 2.000 livros: entram os primeiros 2.000.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void run(phase.data.books)}>
                Importar {books(phase.data.books.length)}
              </Button>
              <Button variant="ghost" onClick={reset}>
                Escolher outro arquivo
              </Button>
            </div>
          </motion.div>
        ) : null}

        {phase.name === "importing" ? (
          <motion.div
            key="importing"
            {...fade}
            className="flex flex-col gap-3 rounded-card border border-border p-4"
          >
            {/* O brilho mostra que segue andando entre um lote e outro */}
            <div
              aria-hidden
              className="relative h-1.5 overflow-hidden rounded-full bg-muted before:absolute before:inset-0 before:animate-shimmer before:bg-linear-to-r before:from-transparent before:via-foreground/10 before:to-transparent motion-reduce:before:hidden"
            >
              <motion.div
                className="h-full origin-left rounded-full bg-foreground"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: phase.done / phase.total }}
                transition={springs.smooth}
              />
            </div>
            <p role="status" className="text-sm">
              Importando {formatNumber(phase.done)} de{" "}
              {formatNumber(phase.total)}
              <span className="block truncate font-mono text-xs text-muted-foreground">
                {phase.current}
              </span>
            </p>
            <p className="text-xs text-pretty text-muted-foreground">
              Cada livro procura o seu no catálogo e, se precisar, na Open
              Library. Pode demorar alguns minutos; deixe esta aba aberta.
            </p>
            <Button
              variant="ghost"
              className="self-start"
              onClick={() => {
                stop.current = true;
              }}
            >
              Parar
            </Button>
          </motion.div>
        ) : null}

        {phase.name === "done" ? (
          <motion.div
            key="done"
            {...fade}
            className="flex flex-col gap-3 rounded-card border border-border p-4"
          >
            <div role="status" className="flex flex-col gap-1">
              <p className="font-serif text-xl">
                {phase.added > 0
                  ? `Entraram ${books(phase.added)} na sua estante.`
                  : "Nenhum livro novo entrou."}
              </p>
              {phase.kept > 0 ? (
                <p className="text-sm text-muted-foreground">
                  {phase.kept === 1
                    ? "1 já estava lá."
                    : `${formatNumber(phase.kept)} já estavam lá.`}
                </p>
              ) : null}
              {phase.stopped ? (
                <p className="text-sm text-muted-foreground">
                  Você parou no meio. Dá para importar o mesmo arquivo de novo:
                  o que já entrou não repete.
                </p>
              ) : null}
            </div>
            {phase.failed.length > 0 ? (
              <div className="flex flex-col gap-1">
                <p className="text-sm">
                  {phase.failed.length === 1
                    ? "1 não deu certo:"
                    : `${formatNumber(phase.failed.length)} não deram certo:`}
                </p>
                <ul className="flex flex-col gap-0.5 font-mono text-xs text-muted-foreground">
                  {phase.failed.slice(0, FAILED_SHOWN).map((title, index) => (
                    <li key={`${title}-${index}`} className="truncate">
                      {title}
                    </li>
                  ))}
                  {phase.failed.length > FAILED_SHOWN ? (
                    <li>
                      e mais {formatNumber(phase.failed.length - FAILED_SHOWN)}
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={routes.profile(username)}>Ver minha estante</Link>
              </Button>
              <Button variant="ghost" onClick={reset}>
                Importar outro arquivo
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
