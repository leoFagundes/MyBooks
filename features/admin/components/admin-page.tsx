import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * O cabeçalho de uma tela do painel e o conteúdo dela num Suspense próprio:
 * numa navegação, o layout não renderiza de novo, e o que a página lê do
 * pedido (a sessão, o papel) precisa do seu limite.
 */
export function AdminPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-4xl tracking-tight">{title}</h1>
        <p className="text-sm text-pretty text-muted-foreground">
          {description}
        </p>
      </header>
      <Suspense
        fallback={
          <div
            aria-busy
            aria-label={`Carregando ${title.toLowerCase()}`}
            className="flex flex-col gap-3"
          >
            <Skeleton className="h-10 w-full max-w-sm" />
            <Skeleton className="h-40 w-full rounded-card" />
          </div>
        }
      >
        {children}
      </Suspense>
    </>
  );
}
