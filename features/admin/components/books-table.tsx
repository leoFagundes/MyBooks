"use client";

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createColumnHelper,
  type PaginationState,
  rowPaginationFeature,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  MoreHorizontal,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchIllustration } from "@/components/ui/illustrations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { BookCover } from "@/features/books/components/book-cover";
import type { ActionResult } from "@/lib/action";
import { formatNumber } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import { moderateBook, reviewManualBook } from "../actions";
import type { AdminBookDetails, AdminBookRow, BookSort } from "../queries";
import { BookFieldsForm } from "./book-fields-form";

const features = tableFeatures({ rowSortingFeature, rowPaginationFeature });
const helper = createColumnHelper<typeof features, AdminBookRow>();
const emptyRows: AdminBookRow[] = [];
const PAGE_SIZE = 20;
const BOOKS_KEY = ["admin-livros"] as const;

const FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "pendentes", label: "Em análise" },
  { value: "rejeitados", label: "Rejeitados" },
  { value: "excluidos", label: "Excluídos" },
] as const;
type FilterValue = (typeof FILTERS)[number]["value"];
const SORTABLE: readonly string[] = ["created_at", "title", "shelves"];

const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

type UrlState = {
  q: string;
  filter: FilterValue;
  sorting: SortingState;
  pagination: PaginationState;
};

function readUrl(search: string): UrlState {
  const params = new URLSearchParams(search);
  const filter = FILTERS.find(
    (item) => item.value === params.get("filtro"),
  )?.value;
  const sort = params.get("ordem");
  const page = Number(params.get("pagina"));
  return {
    q: (params.get("q") ?? "").slice(0, 100),
    filter: filter ?? "todos",
    sorting: [
      {
        id: sort && SORTABLE.includes(sort) ? sort : "created_at",
        desc: params.get("direcao") !== "asc",
      },
    ],
    pagination: {
      pageIndex: Number.isInteger(page) && page > 0 ? page : 0,
      pageSize: PAGE_SIZE,
    },
  };
}

function writeUrl(state: UrlState) {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set("q", state.q);
  if (state.filter !== "todos") params.set("filtro", state.filter);
  const sort = state.sorting[0];
  if (sort && (sort.id !== "created_at" || !sort.desc)) {
    params.set("ordem", sort.id);
    params.set("direcao", sort.desc ? "desc" : "asc");
  }
  if (state.pagination.pageIndex > 0) {
    params.set("pagina", String(state.pagination.pageIndex));
  }
  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${params.size > 0 ? `?${params}` : ""}`,
  );
}

const noSubscription = () => () => {};
const readSearch = () => window.location.search;
const serverSearch = () => "";

async function fetchBooks(
  q: string,
  filter: FilterValue,
  sorting: SortingState,
  pagination: PaginationState,
  signal: AbortSignal,
) {
  const sort = sorting[0];
  const params = new URLSearchParams({
    q,
    ordem: (sort?.id ?? "created_at") as BookSort,
    direcao: sort?.desc === false ? "asc" : "desc",
    pagina: String(pagination.pageIndex),
    tamanho: String(pagination.pageSize),
  });
  if (filter !== "todos") params.set("filtro", filter);
  const response = await fetch(`/api/admin/books?${params}`, { signal });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as { rows: AdminBookRow[]; total: number };
}

const SOURCE_LABEL = {
  manual: "Cadastro manual",
  google: "Google Books",
  openlibrary: "Open Library",
};

/** A situação do livro, em texto. */
function stateOf(book: AdminBookRow) {
  if (book.mergedInto) return `Juntado a ${book.mergedInto.title}`;
  if (book.deletedAt)
    return `Excluído em ${date.format(new Date(book.deletedAt))}`;
  if (book.status === "pending") return "Em análise";
  if (book.status === "rejected") return "Rejeitado";
  return "Aprovado";
}

type Open = {
  book: AdminBookRow;
  dialog: "editar" | "rejeitar" | "excluir" | "restaurar";
};

/**
 * Os livros que não vieram da Open Library (cadastrados à mão e do Google
 * Books) e os excluídos pela moderação. Busca, filtro, ordem e página no
 * servidor, na URL; cada linha edita, aprova, rejeita, exclui ou restaura.
 */
export function BooksTable() {
  const search = useSyncExternalStore(noSubscription, readSearch, serverSearch);
  const [edited, setEdited] = useState<UrlState | null>(null);
  const state = edited ?? readUrl(search);
  const query = useDebouncedValue(state.q.trim(), 250);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<Open | null>(null);
  const [, startTransition] = useTransition();

  function update(patch: Partial<UrlState>) {
    const resets = "q" in patch || "filter" in patch || "sorting" in patch;
    const next: UrlState = {
      ...state,
      ...patch,
      pagination: resets
        ? { ...state.pagination, pageIndex: 0 }
        : (patch.pagination ?? state.pagination),
    };
    setEdited(next);
    writeUrl(next);
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: BOOKS_KEY });

  const result = useQuery({
    queryKey: [
      ...BOOKS_KEY,
      query,
      state.filter,
      state.sorting,
      state.pagination,
    ],
    queryFn: ({ signal }) =>
      fetchBooks(query, state.filter, state.sorting, state.pagination, signal),
    placeholderData: keepPreviousData,
  });

  function approve(book: AdminBookRow) {
    startTransition(async () => {
      const done = await reviewManualBook({
        decision: "approve",
        bookId: book.visual.id,
      });
      if (!done.ok) toast.error(done.error);
      else toast.success("Livro aprovado", { description: book.visual.title });
      await refresh();
    });
  }

  const columns = helper.columns([
    helper.accessor((row) => row.visual.title, {
      id: "title",
      header: "Livro",
      enableSorting: true,
      cell: ({ row }) => {
        const { visual, deletedAt } = row.original;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <BookCover book={visual} size="xs" tilt={false} />
            <div className="flex min-w-0 flex-col">
              {deletedAt ? (
                <span className="line-clamp-2 font-serif text-base">
                  {visual.title}
                </span>
              ) : (
                <Link
                  href={routes.book(visual.id)}
                  target="_blank"
                  className="line-clamp-2 font-serif text-base hover:underline"
                >
                  {visual.title}
                </Link>
              )}
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {visual.authors.join(", ") || "Sem autoria"}
              </span>
            </div>
          </div>
        );
      },
    }),
    helper.display({
      id: "origem",
      header: "Origem",
      cell: ({ row }) => (
        <div className="flex flex-col text-xs">
          <span>{SOURCE_LABEL[row.original.source]}</span>
          {row.original.creator ? (
            <Link
              href={routes.profile(row.original.creator)}
              className="font-mono text-muted-foreground hover:text-foreground hover:underline"
            >
              @{row.original.creator}
            </Link>
          ) : null}
        </div>
      ),
    }),
    helper.display({
      id: "situacao",
      header: "Situação",
      cell: ({ row }) => (
        <span
          className={cn(
            "inline-block rounded-full border px-2 py-px font-mono text-[11px]",
            row.original.deletedAt || row.original.status !== "approved"
              ? "border-foreground"
              : "border-border text-muted-foreground",
          )}
          title={row.original.note ?? undefined}
        >
          {stateOf(row.original)}
        </span>
      ),
    }),
    helper.accessor("shelves", {
      header: "Estantes",
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="font-mono">{formatNumber(getValue())}</span>
      ),
    }),
    helper.accessor("createdAt", {
      id: "created_at",
      header: "Criado",
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs whitespace-nowrap">
          {date.format(new Date(getValue()))}
        </span>
      ),
    }),
    helper.display({
      id: "acoes",
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => {
        const book = row.original;
        const manual = book.source === "manual";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Ações para ${book.visual.title}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {book.deletedAt ? (
                <DropdownMenuItem
                  onSelect={() => setOpen({ book, dialog: "restaurar" })}
                >
                  Restaurar
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem
                    onSelect={() => setOpen({ book, dialog: "editar" })}
                  >
                    Editar
                  </DropdownMenuItem>
                  {manual && book.status !== "approved" ? (
                    <DropdownMenuItem onSelect={() => approve(book)}>
                      Aprovar
                    </DropdownMenuItem>
                  ) : null}
                  {manual && book.status !== "rejected" ? (
                    <DropdownMenuItem
                      onSelect={() => setOpen({ book, dialog: "rejeitar" })}
                    >
                      Rejeitar
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setOpen({ book, dialog: "excluir" })}
                  >
                    Excluir do catálogo
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ]);

  const table = useTable({
    features,
    columns,
    data: result.data?.rows ?? emptyRows,
    rowCount: result.data?.total ?? 0,
    getRowId: (row) => row.visual.id,
    manualSorting: true,
    manualPagination: true,
    enableSortingRemoval: false,
    state: { sorting: state.sorting, pagination: state.pagination },
    onSortingChange: (updater) =>
      update({
        sorting:
          typeof updater === "function" ? updater(state.sorting) : updater,
      }),
    onPaginationChange: (updater) =>
      update({
        pagination:
          typeof updater === "function" ? updater(state.pagination) : updater,
      }),
  });

  const total = result.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageIndex = state.pagination.pageIndex;

  return (
    <div className="flex flex-col gap-4">
      <div className="@container flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div role="search" className="relative w-full xl:max-w-sm">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Buscar por título, autoria, @ ou ISBN"
            placeholder="Título, autoria, @ ou ISBN"
            value={state.q}
            onChange={(event) => update({ q: event.target.value })}
            className="pl-9"
          />
        </div>
        <SegmentedControl
          aria-label="Filtrar"
          size="sm"
          // Sem espaço, 2 × 2 em vez de rolar escondendo opções
          className="grid grid-cols-2 @min-[28rem]:inline-flex @min-[28rem]:self-start"
          value={state.filter}
          onValueChange={(filter) => update({ filter })}
          options={FILTERS}
        />
      </div>

      {result.isError && !result.data ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Não deu para carregar os livros.
          </p>
          <Button variant="outline" size="sm" onClick={() => result.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : !result.data ? (
        <div
          aria-busy
          aria-label="Carregando os livros"
          className="flex flex-col gap-2"
        >
          {Array.from({ length: 6 }, (_, row) => (
            <Skeleton key={row} className="h-16 w-full rounded-control" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          illustration={SearchIllustration}
          title="Nenhum livro por aqui"
          description="Tente outra busca ou outro filtro."
          action={
            <Button
              variant="outline"
              onClick={() => update({ q: "", filter: "todos" })}
            >
              Limpar
            </Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => {
                    const sorted = header.column.getIsSorted();
                    const canSort = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={
                          sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : undefined
                        }
                        className="px-4 py-2.5 text-xs font-medium text-muted-foreground"
                      >
                        {canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="-mx-1 inline-flex cursor-pointer items-center gap-1 rounded-control px-1 hover:text-foreground"
                          >
                            <table.FlexRender header={header} />
                            {sorted === "asc" ? (
                              <ArrowUp className="size-3.5" aria-hidden />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="size-3.5" aria-hidden />
                            ) : (
                              <ChevronsUpDown
                                className="size-3.5 opacity-60"
                                aria-hidden
                              />
                            )}
                          </button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody
              className={cn(
                "divide-y divide-border transition-opacity",
                result.isPlaceholderData && "opacity-60",
              )}
            >
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs text-muted-foreground">
            {formatNumber(total)} {total === 1 ? "livro" : "livros"} · página{" "}
            {formatNumber(pageIndex + 1)} de {formatNumber(pages)}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pageIndex === 0}
              onClick={() => table.previousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pageIndex + 1 >= pages}
              onClick={() => table.nextPage()}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog
        open={open !== null}
        onOpenChange={(next) => (next ? null : setOpen(null))}
      >
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
          {open?.dialog === "editar" ? (
            <EditBook
              book={open.book}
              onDone={() => {
                setOpen(null);
                void refresh();
              }}
            />
          ) : open ? (
            <ConfirmBook
              key={`${open.book.visual.id}-${open.dialog}`}
              open={open}
              onDone={() => {
                setOpen(null);
                void refresh();
              }}
              onCancel={() => setOpen(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

async function fetchDetails(id: string, signal: AbortSignal) {
  const response = await fetch(`/api/admin/books/${id}`, { signal });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as AdminBookDetails;
}

/** Editar: busca os campos que a lista não traz e abre o formulário. */
function EditBook({
  book,
  onDone,
}: {
  book: AdminBookRow;
  onDone: () => void;
}) {
  const details = useQuery({
    queryKey: ["admin-livro", book.visual.id],
    queryFn: ({ signal }) => fetchDetails(book.visual.id, signal),
    staleTime: 0,
  });
  if (!details.data) {
    return (
      <div
        aria-busy
        aria-label="Carregando o livro"
        className="flex flex-col gap-3"
      >
        <DialogTitle>Editar {book.visual.title}</DialogTitle>
        {details.isError ? (
          <p className="text-sm text-muted-foreground">
            Não deu para carregar o livro.
          </p>
        ) : (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        )}
      </div>
    );
  }
  return (
    <BookFieldsForm
      title={`Editar ${book.visual.title}`}
      description="A mudança vale para todo mundo que tem o livro e entra na auditoria."
      confirm="Salvar"
      success="Livro atualizado"
      initial={{
        ...book.visual,
        subtitle: details.data.subtitle,
        isbn13: details.data.isbn13,
        description: details.data.description,
      }}
      onSubmit={(fields, description) =>
        moderateBook(
          { action: "edit", bookId: book.visual.id },
          { fields, description },
        )
      }
      onDone={onDone}
    />
  );
}

/** Rejeitar, excluir e restaurar: a confirmação, com o motivo quando pede. */
function ConfirmBook({
  open,
  onDone,
  onCancel,
}: {
  open: Open;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { book, dialog } = open;
  const title = book.visual.title;
  const copy = {
    rejeitar: {
      title: `Rejeitar ${title}`,
      description:
        "O livro continua na estante de quem o cadastrou, mas fica fora da busca. A pessoa recebe o motivo.",
      confirm: "Rejeitar",
      needsNote: true,
    },
    excluir: {
      title: `Excluir ${title}`,
      description: `Some do MyBooks e de ${formatNumber(book.shelves)} ${book.shelves === 1 ? "estante" : "estantes"}, sem apagar nada: dá para restaurar depois. Vindo de fora, ele também some da busca.`,
      confirm: "Excluir",
      needsNote: true,
    },
    restaurar: {
      title: `Restaurar ${title}`,
      description: book.mergedInto
        ? `Ele volta ao catálogo, mas as estantes continuam em ${book.mergedInto.title}: restaurar não desfaz a junção.`
        : "Ele volta ao catálogo e às estantes de quem o tinha.",
      confirm: "Restaurar",
      needsNote: false,
    },
    editar: { title: "", description: "", confirm: "", needsNote: false },
  }[dialog];

  function run() {
    setError(null);
    startTransition(async () => {
      let result: ActionResult;
      if (dialog === "rejeitar") {
        result = await reviewManualBook({
          decision: "reject",
          bookId: book.visual.id,
          note,
        });
      } else if (dialog === "excluir") {
        result = await moderateBook({
          action: "delete",
          bookId: book.visual.id,
          note,
        });
      } else {
        result = await moderateBook({
          action: "restore",
          bookId: book.visual.id,
        });
      }
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        copy.confirm === "Restaurar" ? "Livro restaurado" : "Pronto",
        {
          description: title,
        },
      );
      onDone();
    });
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        run();
      }}
    >
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>{copy.description}</DialogDescription>
      </DialogHeader>
      {copy.needsNote ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`motivo-${book.visual.id}`}>Motivo</Label>
          <Textarea
            id={`motivo-${book.visual.id}`}
            rows={3}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
      ) : null}
      <div aria-live="polite">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant={dialog === "restaurar" ? "primary" : "destructive"}
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Salvando…" : copy.confirm}
        </Button>
      </DialogFooter>
    </form>
  );
}
