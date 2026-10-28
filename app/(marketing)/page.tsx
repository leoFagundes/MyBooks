import Link from "next/link";
import { PageTransition } from "@/components/motion/page-transition";
import { Button } from "@/components/ui/button";
import { AccountDeletedNotice } from "@/features/profile/components/settings/account-deleted-notice";
import { routes } from "@/lib/routes";

// Landing provisória: a narrativa com rolagem chega na Fase 7. Quem já tem
// conta e abre / vai direto ao /inicio (proxy)
export default function HomePage() {
  return (
    <PageTransition>
      <AccountDeletedNotice />
      <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6 py-24">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          MyBooks
        </p>
        <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-balance sm:text-7xl">
          Sua vida de leitor, em uma estante só.
        </h1>
        <p className="max-w-md text-lg text-pretty text-muted-foreground">
          Guarde o que você leu, o que está lendo e o que ainda quer ler. Visite
          a estante de outros leitores e traga para a sua o que chamar sua
          atenção.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Button size="lg" asChild>
            <Link href={routes.cadastro}>Criar minha estante</Link>
          </Button>
          <Link
            href={routes.entrar}
            className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Já tenho conta
          </Link>
        </div>
      </main>
    </PageTransition>
  );
}
