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
import { useState, useSyncExternalStore } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { initials } from "@/lib/initials";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { cn } from "@/lib/utils";
import type {
  AdminUserRow,
  StaffRole,
  UserFilter,
  UserSort,
  UsersPage,
} from "../queries";
import { sanctionLabel, type UserDialog, UserDialogs } from "./user-dialogs";

const features = tableFeatures({ rowSortingFeature, rowPaginationFeature });
const helper = createColumnHelper<typeof features, AdminUserRow>();
const emptyRows: AdminUserRow[] = [];
const PAGE_SIZE = 20;

const FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "suspensos", label: "Suspensos" },
  { value: "banidos", label: "Banidos" },
  { value: "moderadores", label: "Equipe" },
] as const;
type FilterValue = (typeof FILTERS)[number]["value"];

const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

type UrlState = {
  q: string;
  filter: FilterValue;
  sorting: SortingState;
  pagination: PaginationState;
};

const SORTABLE: readonly string[] = ["created_at", "username", "books"];

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

async function fetchUsers(
  q: string,
  filter: FilterValue,
  sorting: SortingState,
  pagination: PaginationState,
  signal: AbortSignal,
): Promise<UsersPage> {
  const sort = sorting[0];
  const params = new URLSearchParams({
    q,
    ordem: (sort?.id ?? "created_at") as UserSort,
    direcao: sort?.desc === false ? "asc" : "desc",
    pagina: String(pagination.pageIndex),
    tamanho: String(pagination.pageSize),
  });
  if (filter !== "todos") params.set("filtro", filter as UserFilter);
  const response = await fetch(`/api/admin/users?${params}`, { signal });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as UsersPage;
}

/**
 * Os usuários do painel (MELHORIAS 6): busca, filtro, ordem e página no
 * servidor, tudo na URL (sem ida ao servidor da página). Cada linha abre o
 * resumo e as ações que o papel de quem vê permite.
 */
export function UsersTable({
  role,
  selfId,
}: {
  role: StaffRole;
  selfId: string;
}) {
  const search = useSyncExternalStore(noSubscription, readSearch, serverSearch);
  const [edited, setEdited] = useState<UrlState | null>(null);
  const state = edited ?? readUrl(search);
  const query = useDebouncedValue(state.q.trim(), 250);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<{
    user: AdminUserRow;
    dialog: UserDialog;
  } | null>(null);

  function update(patch: Partial<UrlState>) {
    // Busca, filtro e ordem novos voltam para a primeira página
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

  const result = useQuery({
    queryKey: [
      "admin-usuarios",
      query,
      state.filter,
      state.sorting,
      state.pagination,
    ],
    queryFn: ({ signal }) =>
      fetchUsers(query, state.filter, state.sorting, state.pagination, signal),
    placeholderData: keepPreviousData,
  });

  const columns = helper.columns([
    helper.accessor("username", {
      header: "Leitor",
      enableSorting: true,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-8">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt="" />
              ) : null}
              <AvatarFallback className="text-xs">
                {initials(user.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="line-clamp-2 font-medium">
                {user.displayName}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                @{user.username}
              </span>
            </div>
          </div>
        );
      },
    }),
    // O e-mail é só do admin (o banco nem manda para quem modera)
    ...(role === "admin"
      ? [
          helper.accessor("email", {
            header: "E-mail",
            enableSorting: false,
            cell: ({ getValue }) => (
              <span className="font-mono text-xs break-all text-muted-foreground">
                {getValue() ?? "—"}
              </span>
            ),
          }),
        ]
      : []),
    helper.accessor("createdAt", {
      id: "created_at",
      header: "Entrou",
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs whitespace-nowrap">
          {date.format(new Date(getValue()))}
        </span>
      ),
    }),
    helper.accessor("books", {
      header: "Livros",
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="font-mono">{formatNumber(getValue())}</span>
      ),
    }),
    helper.display({
      id: "situacao",
      header: "Situação",
      cell: ({ row }) => {
        const user = row.original;
        const status = sanctionLabel(user);
        return (
          <div className="flex flex-wrap gap-1.5">
            {user.role ? (
              <span className="rounded-full border border-border px-2 py-px font-mono text-[11px]">
                {user.role === "admin" ? "admin" : "moderador"}
              </span>
            ) : null}
            {status ? (
              <span className="rounded-full border border-foreground px-2 py-px font-mono text-[11px]">
                {status}
              </span>
            ) : null}
            {!user.role && !status ? (
              <span className="text-xs text-muted-foreground">Ativa</span>
            ) : null}
          </div>
        );
      },
    }),
    helper.display({
      id: "acoes",
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => (
        <RowActions
          user={row.original}
          role={role}
          self={row.original.id === selfId}
          onOpen={(dialog) => setOpen({ user: row.original, dialog })}
        />
      ),
    }),
  ]);

  const table = useTable({
    features,
    columns,
    data: result.data?.rows ?? emptyRows,
    rowCount: result.data?.total ?? 0,
    getRowId: (row) => row.id,
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
            aria-label={
              role === "admin"
                ? "Buscar por nome, @ ou e-mail"
                : "Buscar por nome ou @"
            }
            placeholder={role === "admin" ? "Nome, @ ou e-mail" : "Nome ou @"}
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
            Não deu para carregar os usuários.
          </p>
          <Button variant="outline" size="sm" onClick={() => result.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : !result.data ? (
        <div
          aria-busy
          aria-label="Carregando os usuários"
          className="flex flex-col gap-2"
        >
          {Array.from({ length: 6 }, (_, row) => (
            <Skeleton key={row} className="h-14 w-full rounded-control" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          illustration={SearchIllustration}
          title="Ninguém por aqui"
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
          <table className="w-full min-w-[44rem] text-left text-sm">
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
            {formatNumber(total)} {total === 1 ? "conta" : "contas"} · página{" "}
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

      <UserDialogs
        user={open?.user ?? null}
        dialog={open?.dialog ?? null}
        role={role}
        onClose={() => setOpen(null)}
        onDone={() => {
          void queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
          void queryClient.invalidateQueries({ queryKey: ["admin-usuario"] });
        }}
      />
    </div>
  );
}

function RowActions({
  user,
  role,
  self,
  onOpen,
}: {
  user: AdminUserRow;
  role: StaffRole;
  self: boolean;
  onOpen: (dialog: UserDialog) => void;
}) {
  const admin = role === "admin";
  // Moderador não age sobre a equipe; ninguém age sobre si mesmo
  const canAct = !self && (admin || !user.role);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Ações para @${user.username}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onOpen("resumo")}>
          Ver resumo
        </DropdownMenuItem>
        {canAct ? (
          <>
            <DropdownMenuSeparator />
            {user.sanction ? (
              admin || user.sanction !== "ban" ? (
                <DropdownMenuItem onSelect={() => onOpen("tirar-sancao")}>
                  Tirar a sanção
                </DropdownMenuItem>
              ) : null
            ) : (
              <DropdownMenuItem onSelect={() => onOpen("suspender")}>
                Suspender
              </DropdownMenuItem>
            )}
            {admin && user.sanction !== "ban" ? (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => onOpen("banir")}
              >
                Banir
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onSelect={() => onOpen("remover-conteudo")}>
              Remover conteúdo
            </DropdownMenuItem>
            {admin && user.role !== "admin" ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onOpen("moderador")}>
                  {user.role === "moderator"
                    ? "Tirar da moderação"
                    : "Promover a moderador"}
                </DropdownMenuItem>
              </>
            ) : null}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
