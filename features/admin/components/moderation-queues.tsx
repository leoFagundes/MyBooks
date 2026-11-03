"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchIllustration } from "@/components/ui/illustrations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RelativeTime } from "@/components/ui/relative-time";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BookCover } from "@/features/books/components/book-cover";
import {
  EDITABLE_FIELDS,
  type EditableField,
  FIELD_LABEL,
  showField,
} from "@/features/books/lib/book-changes";
import type { SearchResult } from "@/features/books/lib/search-result";
import { DELETE_KINDS } from "@/features/books/schemas";
import type { ActionResult } from "@/lib/action";
import { formatNumber } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { reviewChangeRequest, reviewGenre, reviewManualBook } from "../actions";
import { BookFieldsForm } from "./book-fields-form";
import type {
  ModerationQueues as Queues,
  PendingBook,
  PendingGenre,
  PendingRequest,
} from "../queries";

const QUEUES_KEY = ["admin-moderacao"] as const;

async function fetchQueues(signal: AbortSignal) {
  const response = await fetch("/api/admin/moderation", { signal });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as Queues;
}

/** Roda a revisão, avisa no toast e recarrega as filas. */
function useReview() {
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(
    action: () => Promise<ActionResult>,
    message: string,
    onDone?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(message);
      onDone?.();
      await queryClient.invalidateQueries({ queryKey: QUEUES_KEY });
    });
  }
  return { pending, error, run, setError };
}

function ErrorLine({ error }: { error: string | null }) {
  return (
    <div aria-live="polite">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * As filas da moderação (MELHORIAS 7): os livros manuais novos, as
 * sugestões de edição, exclusão e mescla, e os gêneros criados por leitores.
 * Cada decisão vai à função do banco (numa transação), entra na auditoria e
 * avisa quem criou ou sugeriu.
 */
export function ModerationQueues() {
  const queues = useQuery({
    queryKey: QUEUES_KEY,
    queryFn: ({ signal }) => fetchQueues(signal),
  });

  if (queues.isError && !queues.data) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Não deu para carregar as filas.
        </p>
        <Button variant="outline" size="sm" onClick={() => queues.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (!queues.data) {
    return (
      <div
        aria-busy
        aria-label="Carregando as filas"
        className="flex flex-col gap-3"
      >
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-40 w-full rounded-card" />
      </div>
    );
  }
  const { books, requests, genres } = queues.data;

  return (
    <Tabs defaultValue="livros">
      <TabsList aria-label="Filas">
        <TabsTrigger value="livros">
          Livros novos · {formatNumber(books.length)}
        </TabsTrigger>
        <TabsTrigger value="sugestoes">
          Sugestões · {formatNumber(requests.length)}
        </TabsTrigger>
        <TabsTrigger value="generos">
          Gêneros · {formatNumber(genres.length)}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="livros" className="pt-6">
        {books.length === 0 ? (
          <Empty what="livro novo" />
        ) : (
          <ul className="flex flex-col gap-4">
            {books.map((book) => (
              <BookItem key={book.id} book={book} />
            ))}
          </ul>
        )}
      </TabsContent>
      <TabsContent value="sugestoes" className="pt-6">
        {requests.length === 0 ? (
          <Empty what="sugestão" />
        ) : (
          <ul className="flex flex-col gap-4">
            {requests.map((request) => (
              <RequestItem key={request.id} request={request} />
            ))}
          </ul>
        )}
      </TabsContent>
      <TabsContent value="generos" className="pt-6">
        {genres.length === 0 ? (
          <Empty what="gênero" />
        ) : (
          <ul className="flex flex-col gap-4">
            {genres.map((genre) => (
              <GenreItem key={genre.slug} genre={genre} />
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}

function Empty({ what }: { what: string }) {
  return (
    <EmptyState
      illustration={SearchIllustration}
      title="Fila vazia"
      description={`Nenhum ${what} esperando revisão. Quando chegar, aparece aqui.`}
    />
  );
}

const card = "flex flex-col gap-4 rounded-card border border-border p-5";

function Meta({
  by,
  at,
  extra,
}: {
  by: string | null;
  at: string;
  extra?: string;
}) {
  return (
    <p className="font-mono text-xs text-muted-foreground">
      {by ? (
        <Link
          href={routes.profile(by)}
          className="hover:text-foreground hover:underline"
        >
          @{by}
        </Link>
      ) : (
        "conta removida"
      )}{" "}
      · <RelativeTime iso={at} />
      {extra ? ` · ${extra}` : ""}
    </p>
  );
}

type BookDialog = "editar" | "rejeitar" | "duplicado" | null;

function BookItem({ book }: { book: PendingBook }) {
  const review = useReview();
  const [dialog, setDialog] = useState<BookDialog>(null);
  const { visual } = book;
  const facts = [
    visual.publishedYear,
    visual.pageCount ? `${formatNumber(visual.pageCount)} páginas` : null,
    book.isbn13 ? `ISBN ${book.isbn13}` : null,
  ].filter(Boolean);

  return (
    <li className={card}>
      <div className="flex gap-4">
        <BookCover book={visual} size="sm" tilt={false} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Link
            href={routes.book(book.id)}
            target="_blank"
            className="line-clamp-2 font-serif text-xl leading-tight hover:underline"
          >
            {visual.title}
          </Link>
          {book.subtitle ? (
            <p className="text-sm text-muted-foreground">{book.subtitle}</p>
          ) : null}
          <p className="text-sm">
            {visual.authors.join(", ") || "Sem autoria"}
          </p>
          {facts.length > 0 ? (
            <p className="font-mono text-xs text-muted-foreground">
              {facts.join(" · ")}
            </p>
          ) : null}
          {book.description ? (
            <p className="line-clamp-3 text-sm text-pretty text-muted-foreground">
              {book.description}
            </p>
          ) : null}
          <Meta
            by={book.creator}
            at={book.createdAt}
            extra={`${formatNumber(book.shelves)} ${book.shelves === 1 ? "estante" : "estantes"}`}
          />
        </div>
      </div>
      <ErrorLine error={review.error} />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={review.pending}
          onClick={() =>
            review.run(
              () => reviewManualBook({ decision: "approve", bookId: book.id }),
              "Livro aprovado",
            )
          }
        >
          Aprovar
        </Button>
        <Button size="sm" variant="outline" onClick={() => setDialog("editar")}>
          Editar e aprovar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialog("duplicado")}
        >
          É duplicado de…
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDialog("rejeitar")}>
          Rejeitar
        </Button>
      </div>
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => (open ? null : setDialog(null))}
      >
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
          {dialog === "editar" ? (
            <EditAndApprove book={book} onDone={() => setDialog(null)} />
          ) : dialog === "rejeitar" ? (
            <NoteForm
              title={`Rejeitar ${visual.title}`}
              description="O livro continua na estante de quem cadastrou, mas fica fora da busca. A pessoa recebe o motivo."
              confirm="Rejeitar"
              required
              onSubmit={(note) =>
                reviewManualBook({ decision: "reject", bookId: book.id, note })
              }
              success="Livro rejeitado"
              onDone={() => setDialog(null)}
            />
          ) : dialog === "duplicado" ? (
            <MergeForm book={book} onDone={() => setDialog(null)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </li>
  );
}

/** Uma janela com a nota e a confirmação (rejeitar pede a nota). */
function NoteForm({
  title,
  description,
  confirm,
  required,
  onSubmit,
  success,
  onDone,
}: {
  title: string;
  description: string;
  confirm: string;
  required?: boolean;
  onSubmit: (note: string) => Promise<ActionResult>;
  success: string;
  onDone: () => void;
}) {
  const id = useId();
  const [note, setNote] = useState("");
  const review = useReview();
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        review.run(() => onSubmit(note), success, onDone);
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-nota`}>
          {required ? "Motivo" : "Nota (opcional)"}
        </Label>
        <Textarea
          id={`${id}-nota`}
          rows={3}
          maxLength={1000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <ErrorLine error={review.error} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={review.pending}
          aria-busy={review.pending}
        >
          {review.pending ? "Salvando…" : confirm}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditAndApprove({
  book,
  onDone,
}: {
  book: PendingBook;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  return (
    <BookFieldsForm
      title="Editar e aprovar"
      description="Corrija o que precisar; o livro entra na busca assim."
      confirm="Salvar e aprovar"
      success="Livro editado e aprovado"
      initial={{
        ...book.visual,
        subtitle: book.subtitle,
        isbn13: book.isbn13,
        description: book.description,
      }}
      onSubmit={async (fields, description) => {
        const result = await reviewManualBook(
          { decision: "approve", bookId: book.id },
          { fields, description },
        );
        if (result.ok) {
          await queryClient.invalidateQueries({ queryKey: QUEUES_KEY });
        }
        return result;
      }}
      onDone={onDone}
    />
  );
}

async function searchCatalog(query: string, signal: AbortSignal) {
  const response = await fetch(
    `/api/books/search?q=${encodeURIComponent(query)}&scope=catalog`,
    { signal },
  );
  if (!response.ok) throw new Error(String(response.status));
  return ((await response.json()) as { results: SearchResult[] }).results;
}

/** "É duplicado de…": escolhe o livro que fica, e a mescla junta os dois. */
function MergeForm({
  book,
  onDone,
}: {
  book: PendingBook;
  onDone: () => void;
}) {
  const id = useId();
  const [search, setSearch] = useState(book.visual.title);
  const [chosen, setChosen] = useState<SearchResult | null>(null);
  const query = useDebouncedValue(search.trim(), 250);
  const results = useQuery({
    queryKey: ["busca-livros", query, "catalog"],
    queryFn: ({ signal }) => searchCatalog(query, signal),
    enabled: query.length >= 2,
  });
  const options = (results.data ?? []).filter(
    (result) => result.catalogId && result.catalogId !== book.id,
  );
  const review = useReview();

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!chosen?.catalogId) {
          review.setError("Escolha o livro que fica.");
          return;
        }
        const keeper = chosen.catalogId;
        review.run(
          () =>
            reviewManualBook({
              decision: "merge",
              bookId: book.id,
              duplicateOf: keeper,
            }),
          "Livros juntados",
          onDone,
        );
      }}
    >
      <DialogHeader>
        <DialogTitle>É duplicado de…</DialogTitle>
        <DialogDescription>
          {book.visual.title} entra no livro que você escolher: as estantes, as
          coleções e as citações passam para ele, e o endereço antigo leva até
          lá.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-busca`}>O livro que fica</Label>
        <Input
          id={`${id}-busca`}
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setChosen(null);
          }}
        />
        <ul aria-label="Livros do catálogo" className="flex flex-col gap-1">
          {options.slice(0, 6).map((option) => (
            <li key={option.catalogId}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-control px-2 py-1.5 text-sm hover:bg-muted">
                <input
                  type="radio"
                  name={`${id}-alvo`}
                  checked={chosen?.catalogId === option.catalogId}
                  onChange={() => setChosen(option)}
                  className="mt-1 size-4 accent-foreground"
                />
                <span className="min-w-0">
                  <span className="line-clamp-2 font-serif">
                    {option.title}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {[option.authors.join(", "), option.publishedYear]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {query.length >= 2 && results.data && options.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum outro livro com esse nome.
          </p>
        ) : null}
      </div>
      <ErrorLine error={review.error} />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={review.pending}
          aria-busy={review.pending}
        >
          {review.pending ? "Juntando…" : "Juntar os dois"}
        </Button>
      </DialogFooter>
    </form>
  );
}

const TYPE_LABEL = {
  edit: "Edição",
  delete: "Exclusão",
  merge: "Duplicado",
} as const;

/** Uma sugestão: o diff campo a campo (edição) ou o motivo (exclusão, mescla). */
function RequestItem({ request }: { request: PendingRequest }) {
  const review = useReview();
  const [rejecting, setRejecting] = useState(false);
  const fields = EDITABLE_FIELDS.filter((key) => key in request.changes);
  // O livro mudou depois da sugestão: o "antes" dela já não é o de agora
  const changed = fields.filter(
    (key) =>
      JSON.stringify(request.base[key] ?? null) !==
      JSON.stringify(request.book.current[key] ?? null),
  );
  const kind =
    typeof request.changes.kind === "string"
      ? DELETE_KINDS.find((item) => item.value === request.changes.kind)?.label
      : null;

  return (
    <li className={card}>
      <div className="flex flex-col gap-1">
        <p className="text-sm">
          <span className="rounded-full border border-border px-2 py-px font-mono text-[11px]">
            {TYPE_LABEL[request.type]}
          </span>{" "}
          <Link
            href={routes.book(request.book.id)}
            target="_blank"
            className="font-serif text-lg hover:underline"
          >
            {request.book.title}
          </Link>
        </p>
        <Meta by={request.requester} at={request.createdAt} />
      </div>
      {request.type === "edit" ? (
        <div className="overflow-x-auto rounded-control border border-border">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Campo
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Antes
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Depois
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fields.map((key: EditableField) => (
                <tr key={key} className="align-top">
                  <th
                    scope="row"
                    className="px-3 py-2 text-xs font-medium whitespace-nowrap"
                  >
                    {FIELD_LABEL[key]}
                  </th>
                  <td className="px-3 py-2 text-pretty text-muted-foreground line-through decoration-border-strong">
                    {showField(request.base[key])}
                  </td>
                  <td className="px-3 py-2 text-pretty">
                    {showField(request.changes[key])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm">
          {kind ?? "Excluir do catálogo"}
          {request.target ? (
            <>
              :{" "}
              <Link
                href={routes.book(request.target.id)}
                target="_blank"
                className="font-serif hover:underline"
              >
                {request.target.title}
              </Link>{" "}
              fica, e as estantes passam para ele
            </>
          ) : null}
        </p>
      )}
      {changed.length > 0 ? (
        <p className="rounded-control border border-foreground px-3 py-2 text-sm text-pretty">
          O livro mudou depois desta sugestão (
          {changed.map((key) => FIELD_LABEL[key]).join(", ")}
          ). Agora:{" "}
          {changed
            .map(
              (key) =>
                `${FIELD_LABEL[key]}: ${showField(request.book.current[key])}`,
            )
            .join(" · ")}
        </p>
      ) : null}
      <p className="text-sm text-pretty text-muted-foreground">
        “{request.reason}”
      </p>
      <ErrorLine error={review.error} />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={review.pending}
          onClick={() =>
            review.run(
              () =>
                reviewChangeRequest({
                  requestId: request.id,
                  approve: true,
                  note: "",
                }),
              "Sugestão aplicada",
            )
          }
        >
          {request.type === "edit"
            ? "Aprovar e aplicar"
            : request.type === "merge"
              ? "Juntar os dois"
              : "Excluir o livro"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setRejecting(true)}>
          Rejeitar
        </Button>
      </div>
      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent>
          <NoteForm
            title="Rejeitar a sugestão"
            description="Quem sugeriu recebe a nota."
            confirm="Rejeitar"
            required
            onSubmit={(note) =>
              reviewChangeRequest({
                requestId: request.id,
                approve: false,
                note,
              })
            }
            success="Sugestão rejeitada"
            onDone={() => setRejecting(false)}
          />
        </DialogContent>
      </Dialog>
    </li>
  );
}

function GenreItem({ genre }: { genre: PendingGenre }) {
  const review = useReview();
  const [rejecting, setRejecting] = useState(false);
  return (
    <li className={card}>
      <div className="flex flex-col gap-1">
        <p className="font-serif text-xl">{genre.name}</p>
        <Meta
          by={genre.creator}
          at={genre.createdAt}
          extra={`${formatNumber(genre.favorites)} ${genre.favorites === 1 ? "favorito" : "favoritos"}`}
        />
      </div>
      <ErrorLine error={review.error} />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={review.pending}
          onClick={() =>
            review.run(
              () => reviewGenre({ slug: genre.slug, approve: true, note: "" }),
              "Gênero aprovado",
            )
          }
        >
          Aprovar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setRejecting(true)}>
          Recusar
        </Button>
      </div>
      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent>
          <NoteForm
            title={`Recusar ${genre.name}`}
            description="O gênero some dos perfis que o favoritaram. Quem criou recebe a nota."
            confirm="Recusar"
            onSubmit={(note) =>
              reviewGenre({ slug: genre.slug, approve: false, note })
            }
            success="Gênero recusado"
            onDone={() => setRejecting(false)}
          />
        </DialogContent>
      </Dialog>
    </li>
  );
}
