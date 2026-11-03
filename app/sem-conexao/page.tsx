import type { Metadata } from "next";
import { Logo } from "@/components/shell/logo";
import { OfflineIllustration } from "@/components/ui/illustrations";
import { RetryButton } from "@/features/pwa/components/retry-button";

export const metadata: Metadata = {
  title: "Sem conexão",
  robots: { index: false, follow: false },
};

/**
 * A página que o service worker mostra quando uma página não chega por falta
 * de rede (MELHORIAS 9.1). É estática e fica no cache desde a instalação.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <OfflineIllustration className="h-16 w-24 text-muted-foreground" />
      <h1 className="max-w-xl font-serif text-4xl leading-tight tracking-tight text-balance sm:text-5xl">
        A internet saiu para um café.
      </h1>
      <p className="max-w-md text-pretty text-muted-foreground">
        Esta página precisa de conexão. Assim que a rede voltar, é só tentar de
        novo: sua estante continua onde você deixou.
      </p>
      <RetryButton />
    </main>
  );
}
