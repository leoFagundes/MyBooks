import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/shell/theme-toggle";

export const metadata: Metadata = {
  title: "Componentes",
  robots: { index: false },
};

// Vitrine de tudo que a interface usa. Fica fora da produção (previews e
// local continuam com ela).
export default function DevPage() {
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="flex flex-col gap-3 border-b border-border pb-10">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Fase 1 · Fundação
          </p>
          <ThemeToggle />
        </div>
        <h1 className="font-serif text-5xl tracking-tight text-balance">
          Componentes e movimento
        </h1>
        <p className="max-w-xl text-pretty text-muted-foreground">
          Tudo que a interface do MyBooks usa, num lugar só. Passe o mouse,
          clique e troque o tema para ver cada estado.
        </p>
      </header>
    </main>
  );
}
