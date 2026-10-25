import { Suspense } from "react";
import { AccountActions } from "@/components/shell/account-actions";
import { BottomNav } from "@/components/shell/bottom-nav";
import { EstanteLink } from "@/components/shell/estante-link";
import type { NavViewer } from "@/components/shell/nav-links";
import { TopNav } from "@/components/shell/top-nav";
import { getViewer } from "@/lib/auth";

// Só o que a barra desenha vai para o cliente
async function navViewer(): Promise<NavViewer | null> {
  const viewer = await getViewer();
  return viewer
    ? {
        username: viewer.username,
        displayName: viewer.displayName,
        avatarUrl: viewer.avatarUrl,
      }
    : null;
}

async function ViewerAccountActions() {
  return <AccountActions viewer={await navViewer()} />;
}

async function ViewerEstanteLink({ variant }: { variant: "top" | "pill" }) {
  return <EstanteLink viewer={await navViewer()} variant={variant} />;
}

function estanteSlot(variant: "top" | "pill") {
  return (
    <Suspense fallback={<EstanteLink viewer={null} variant={variant} />}>
      <ViewerEstanteLink variant={variant} />
    </Suspense>
  );
}

// Telas do app: barra superior e, no celular, a pílula inferior. As barras
// fazem parte da página; só o que depende da conta chega depois, cada pedaço
// no seu Suspense, para nada esperar a sessão (e a barra não ser trocada
// inteira no meio de um clique)
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col pb-28 md:pb-0">
      <TopNav
        slots={{
          estante: estanteSlot("top"),
          account: (
            <Suspense fallback={<AccountActions viewer={undefined} />}>
              <ViewerAccountActions />
            </Suspense>
          ),
        }}
      />
      <div className="flex-1">{children}</div>
      <BottomNav estante={estanteSlot("pill")} />
    </div>
  );
}
