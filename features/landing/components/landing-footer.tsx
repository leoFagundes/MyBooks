import Link from "next/link";
import { TextReveal } from "@/components/motion/text-reveal";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

const quietLink =
  "rounded-control text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline";

/** A chamada final da landing (spec §5.1). */
export function LandingCallToAction() {
  return (
    <section
      aria-label="Comece agora"
      className="mx-auto flex max-w-3xl flex-col items-center gap-7 px-6 py-32 text-center sm:py-44"
    >
      <TextReveal
        as="h2"
        text="Sua estante está esperando."
        className="font-serif text-5xl leading-[1.02] tracking-tight text-balance sm:text-7xl"
      />
      <p className="max-w-md text-pretty text-muted-foreground">
        Comece pelo livro da sua mesa de cabeceira. O resto vem junto.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <Button size="lg" asChild>
          <Link href={routes.cadastro}>Criar minha estante</Link>
        </Button>
        <Link href={routes.explorar} className={quietLink}>
          Explorar sem conta
        </Link>
      </div>
    </section>
  );
}

/** O rodapé: a marca, os caminhos e o crédito da Open Library. */
export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Logo />
        <nav
          aria-label="Rodapé"
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          <Link href={routes.explorar} className={quietLink}>
            Explorar
          </Link>
          <Link href={routes.entrar} className={quietLink}>
            Entrar
          </Link>
          <Link href={routes.cadastro} className={quietLink}>
            Criar conta
          </Link>
        </nav>
        <p className="font-mono text-xs text-muted-foreground">
          Dados e capas dos livros:{" "}
          <a
            href="https://openlibrary.org"
            className="rounded-control text-foreground underline underline-offset-4"
          >
            Open Library
          </a>
        </p>
      </div>
    </footer>
  );
}
