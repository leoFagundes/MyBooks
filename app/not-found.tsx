import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
      <p className="font-mono text-xs text-muted-foreground">404</p>
      <h1 className="font-serif text-4xl tracking-tight text-balance">
        Essa página não está na estante.
      </h1>
      <p className="text-pretty text-muted-foreground">
        Talvez o endereço tenha mudado, ou esse livro ainda não chegou por aqui.
      </p>
      <Link
        href="/"
        className="mt-2 w-fit rounded-control border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
