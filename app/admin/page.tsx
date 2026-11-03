import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage } from "@/features/admin/components/admin-page";
import { GrowthChart } from "@/features/admin/components/growth-chart";
import { getOverview, requireStaff } from "@/features/admin/queries";
import { formatNumber } from "@/lib/format";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Visão geral" };

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-card border border-border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-mono text-3xl tracking-tight">{formatNumber(value)}</p>
      {detail ? (
        <p className="font-mono text-xs text-muted-foreground">{detail}</p>
      ) : null}
    </div>
  );
}

/** Visão geral do painel: os números do MyBooks e o crescimento por semana. */
export default function AdminOverviewPage() {
  return (
    <AdminPage
      title="Visão geral"
      description="Como o MyBooks anda, de hoje aos últimos 30 dias."
    >
      <Overview />
    </AdminPage>
  );
}

async function Overview() {
  await requireStaff();
  const overview = await getOverview();
  const { users, active, books, collections, pending } = overview;

  return (
    <>
      <section
        aria-label="Leitores"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Stat label="Leitores novos hoje" value={users.day} />
        <Stat label="Nos últimos 7 dias" value={users.week} />
        <Stat label="Nos últimos 30 dias" value={users.month} />
        <Stat label="Leitores no total" value={users.total} />
      </section>
      <section
        aria-label="Atividade"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Stat
          label="Ativos na semana"
          value={active.week}
          detail={`${formatNumber(active.month)} nos últimos 30 dias`}
        />
        <Stat
          label="Livros no catálogo"
          value={books.total}
          detail={`${formatNumber(books.week)} na semana · ${formatNumber(books.month)} em 30 dias`}
        />
        <Stat
          label="Coleções"
          value={collections.total}
          detail={`${formatNumber(collections.week)} na semana · ${formatNumber(collections.month)} em 30 dias`}
        />
        <Link
          href={routes.adminModeracao}
          className="flex flex-col gap-1 rounded-card border border-border p-5 transition-colors hover:bg-muted"
        >
          <p className="text-sm text-muted-foreground">Esperando revisão</p>
          <p className="font-mono text-3xl tracking-tight">
            {formatNumber(
              pending.books +
                pending.requests +
                pending.genres +
                pending.reports,
            )}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {formatNumber(pending.books)} livros ·{" "}
            {formatNumber(pending.requests)} sugestões ·{" "}
            {formatNumber(pending.genres)} gêneros ·{" "}
            {formatNumber(pending.reports)} denúncias
          </p>
        </Link>
      </section>
      <GrowthChart weeks={overview.growth} />
      <p className="text-sm text-muted-foreground">
        Para agir sobre uma conta, vá a{" "}
        <Link
          href={routes.adminUsuarios}
          className="underline underline-offset-4 hover:text-foreground"
        >
          Usuários
        </Link>
        .
      </p>
    </>
  );
}
