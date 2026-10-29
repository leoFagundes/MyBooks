import Link from "next/link";
import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

const link =
  "rounded-control px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground";

/** A barra da landing: a marca, Explorar, Entrar e criar a conta. */
export function LandingHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Principal" className="flex items-center gap-1">
          <Link
            href={routes.explorar}
            className={`hidden sm:inline-flex ${link}`}
          >
            Explorar
          </Link>
          <Link href={routes.entrar} className={link}>
            Entrar
          </Link>
          <ThemeToggle />
          <Button size="sm" asChild className="ml-1">
            <Link href={routes.cadastro}>Criar conta</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
