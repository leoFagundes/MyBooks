import Link from "next/link";
import { PageTransition } from "@/components/motion/page-transition";
import { Logo } from "@/components/shell/logo";
import { LandingFooter } from "@/features/landing/components/landing-footer";
import { routes } from "@/lib/routes";

// Créditos, termos e privacidade: a marca no topo, o texto e o rodapé da
// landing, sem a barra do app (quem lê pode não ter conta)
export default function InstitutionalLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <Link
            href={routes.explorar}
            className="rounded-control text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Explorar
          </Link>
        </div>
      </header>
      <PageTransition>
        <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          {children}
        </main>
      </PageTransition>
      <LandingFooter />
    </>
  );
}
