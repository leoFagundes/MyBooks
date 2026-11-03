import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminNav } from "@/features/admin/components/admin-nav";
import { requireStaff } from "@/features/admin/queries";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel · MyBooks" },
  robots: { index: false, follow: false },
};

/**
 * O painel administrativo (MELHORIAS 6). Segunda das três camadas: o proxy
 * já barrou quem não é da equipe, e aqui o servidor confere de novo antes de
 * mostrar qualquer coisa (sem o papel, 404). Cada action confere a sua vez.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <AdminNav role={staff.role} />
      <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-1 flex-col gap-8 px-4 py-8 sm:px-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div
      aria-busy
      aria-label="Carregando o painel"
      className="flex min-h-dvh flex-col md:flex-row"
    >
      <div className="flex flex-col gap-3 border-b border-border p-6 md:w-60 md:border-r md:border-b-0">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full rounded-card" />
      </div>
    </div>
  );
}
