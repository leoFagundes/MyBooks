"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  type PaginationState,
  rowPaginationFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchIllustration } from "@/components/ui/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AuditRow } from "../queries";

const features = tableFeatures({ rowPaginationFeature });
const helper = createColumnHelper<typeof features, AuditRow>();
const emptyRows: AuditRow[] = [];
const PAGE_SIZE = 25;

/** O nome de cada ação, como aparece no filtro e na tabela. */
export const AUDIT_ACTIONS: Record<string, string> = {
  "usuario.suspender": "Suspendeu",
  "usuario.banir": "Baniu",
  "usuario.tirar-sancao": "Tirou a sanção",
  "usuario.remover-conteudo": "Removeu conteúdo",
  "usuario.promover-moderador": "Promoveu a moderador",
  "usuario.tirar-moderador": "Tirou da moderação",
  "configuracao.banner": "Mudou o aviso",
  "configuracao.maintenance": "Mudou a manutenção",
  "configuracao.features": "Mudou as funcionalidades",
  "livro.aprovar": "Aprovou um livro",
  "livro.editar-e-aprovar": "Editou e aprovou um livro",
  "livro.rejeitar": "Rejeitou um livro",
  "livro.mesclar": "Juntou livros duplicados",
  "livro.excluir": "Excluiu um livro",
  "livro.restaurar": "Restaurou um livro",
  "livro.editar": "Editou um livro",
  "sugestao.aprovar": "Aceitou uma sugestão",
  "sugestao.rejeitar": "Recusou uma sugestão",
  "genero.aprovar": "Aprovou um gênero",
  "genero.recusar": "Recusou um gênero",
};

const when = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const json = (value: unknown) =>
  value === null || value === undefined ? "—" : JSON.stringify(value, null, 2);

const columns = helper.columns([
  helper.accessor("createdAt", {
    header: "Quando",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs whitespace-nowrap">
        {when.format(new Date(getValue()))}
      </span>
    ),
  }),
  helper.accessor("actor", {
    header: "Quem",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">
        {getValue() ? `@${getValue()}` : "—"}
      </span>
    ),
  }),
  helper.accessor("action", {
    header: "O quê",
    cell: ({ getValue }) => AUDIT_ACTIONS[getValue()] ?? getValue(),
  }),
  helper.display({
    id: "alvo",
    header: "Em quem",
    cell: ({ row }) => (
      <span className="font-mono text-xs break-all text-muted-foreground">
        {row.original.targetType}
        {row.original.targetId ? ` · ${row.original.targetId}` : ""}
      </span>
    ),
  }),
  helper.display({
    id: "detalhes",
    header: "Motivo e mudança",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1.5">
        {row.original.reason ? (
          <p className="text-pretty">{row.original.reason}</p>
        ) : null}
        <details>
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Antes e depois
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <pre className="overflow-x-auto rounded-control bg-muted p-2 font-mono text-[11px]">
              {json(row.original.before)}
            </pre>
            <pre className="overflow-x-auto rounded-control bg-muted p-2 font-mono text-[11px]">
              {json(row.original.after)}
            </pre>
          </div>
        </details>
      </div>
    ),
  }),
]);

async function fetchAudit(
  action: string,
  pagination: PaginationState,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({
    pagina: String(pagination.pageIndex),
    tamanho: String(pagination.pageSize),
  });
  if (action) params.set("acao", action);
  const response = await fetch(`/api/admin/audit?${params}`, { signal });
  if (!response.ok) throw new Error(String(response.status));
  return (await response.json()) as { rows: AuditRow[]; total: number };
}

/** A auditoria (MELHORIAS 6): toda ação administrativa, da mais nova à mais antiga. */
export function AuditTable() {
  const [action, setAction] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });
  const result = useQuery({
    queryKey: ["admin-auditoria", action, pagination],
    queryFn: ({ signal }) => fetchAudit(action, pagination, signal),
    placeholderData: keepPreviousData,
  });
  const table = useTable({
    features,
    columns,
    data: result.data?.rows ?? emptyRows,
    rowCount: result.data?.total ?? 0,
    getRowId: (row) => row.id,
    manualPagination: true,
    state: { pagination },
    onPaginationChange: setPagination,
  });
  const total = result.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm sm:max-w-xs">
        <span className="font-medium">Ação</span>
        <select
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
          className="h-10 rounded-control border border-input bg-surface px-3 text-sm"
        >
          <option value="">Todas</option>
          {Object.entries(AUDIT_ACTIONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {result.isError && !result.data ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Não deu para carregar a auditoria.
          </p>
          <Button variant="outline" size="sm" onClick={() => result.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : !result.data ? (
        <div
          aria-busy
          aria-label="Carregando a auditoria"
          className="flex flex-col gap-2"
        >
          {Array.from({ length: 6 }, (_, row) => (
            <Skeleton key={row} className="h-12 w-full rounded-control" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          illustration={SearchIllustration}
          title="Nada registrado ainda"
          description="Cada ação no painel aparece aqui, com quem fez, quando, e o antes e depois."
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th
                      key={header.id}
                      scope="col"
                      className="px-4 py-2.5 text-xs font-medium text-muted-foreground"
                    >
                      <table.FlexRender header={header} />
                    </th>
                  ))}
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
                    <td key={cell.id} className="px-4 py-3 align-top">
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
            {formatNumber(total)} {total === 1 ? "registro" : "registros"} ·
            página {formatNumber(pagination.pageIndex + 1)} de{" "}
            {formatNumber(pages)}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.pageIndex === 0}
              onClick={() => table.previousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.pageIndex + 1 >= pages}
              onClick={() => table.nextPage()}
            >
              Próxima
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
