import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/shell/logo";
import { getSiteSettings } from "@/features/admin/queries";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Em manutenção",
  robots: { index: false, follow: false },
};

/**
 * O que quem não é da equipe vê com o modo manutenção ligado: o proxy
 * reescreve as páginas para cá. Desligado, só convida a voltar.
 */
export default async function MaintenancePage() {
  const { maintenance } = await getSiteSettings();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <h1 className="max-w-xl font-serif text-4xl leading-tight tracking-tight text-balance sm:text-5xl">
        {maintenance.enabled
          ? "Estamos arrumando as estantes."
          : "Tudo funcionando por aqui."}
      </h1>
      <p className="max-w-md text-pretty text-muted-foreground">
        {maintenance.enabled
          ? maintenance.message ||
            "O MyBooks volta em instantes. Obrigado pela paciência."
          : "O MyBooks está no ar."}
      </p>
      {maintenance.enabled ? null : (
        <Link
          href={routes.home}
          className="text-sm underline underline-offset-4 hover:text-foreground"
        >
          Voltar ao MyBooks
        </Link>
      )}
    </main>
  );
}
