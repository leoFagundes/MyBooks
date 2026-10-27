import Link from "next/link";
import { LockedShelfIllustration } from "@/components/ui/illustrations";
import { routes } from "@/lib/routes";

// Privada de outra pessoa ou apagada: para quem não pode ver, as duas são iguais
export default function CollectionNotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-start gap-4 px-6 py-24">
      <LockedShelfIllustration className="mb-2 h-16 w-24 text-border-strong" />
      <p className="font-mono text-xs text-muted-foreground">404</p>
      <h1 className="font-serif text-4xl tracking-tight text-balance">
        Essa coleção não está aqui.
      </h1>
      <p className="text-pretty text-muted-foreground">
        Ela pode ser privada, ou ter sido apagada por quem a fez.
      </p>
      <Link
        href={routes.home}
        className="mt-2 w-fit rounded-control border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
